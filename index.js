#!/usr/bin/env node

/**
 * FutureCloud Monitoring Plugin CLI
 * ─────────────────────────────────────────────────────────────────
 * Entry point utama.
 *
 * CATATAN UNTUK DEVELOPER:
 * ─ Logika existing pada command 'install' TIDAK diubah.
 * ─ Tiga fitur baru ditambahkan sebagai modul terpisah di lib/:
 *     1. lib/licenseVerifier.js  → prompt key & verifikasi API
 *     2. lib/frameworkSelector.js → prompt pilih framework
 *     3. lib/fileDeployer.js     → deploy file ke path framework
 *     4. lib/credentialInjector.js → injeksi key ke .env / HTML
 *     5. lib/routeAdvisor.js     → auto-routing & panduan terminal
 * ─────────────────────────────────────────────────────────────────
 */

const { program } = require('commander');
const fs          = require('fs');
const path        = require('path');
const chalk       = require('chalk');

// ┌─ KUSTOMISASI ────────────────────────────────────────────────┐
// │ Ganti URL ini dengan URL production API FutureCloud Anda.    │
// │ Sama dengan nilai BASE_URL di lib/licenseVerifier.js.        │
// └──────────────────────────────────────────────────────────────┘
const API_URL = 'https://api-monitoring.futurecloud.id/api/v1';

// ── Import modul baru (tidak mengganggu logika existing) ──────
const { promptLicenseKey, verifyLicenseKey } = require('./lib/licenseVerifier');
const { selectFramework }                     = require('./lib/frameworkSelector');
const { deployFile }                          = require('./lib/fileDeployer');
const { injectToEnv, injectScriptTagToHtml }  = require('./lib/credentialInjector');
const { runRouteAdvisor }                     = require('./lib/routeAdvisor');

// ─── Setup CLI ─────────────────────────────────────────────────

program
  .name('fc-m | futurecloud-monitoring')
  .version('1.1.0')
  .description('FutureCloud Monitoring Plugin Installer');

// ─── Command: install ─────────────────────────────────────────

program
  .command('install')
  .description('Install the monitoring UI to your project')
  .option('-k, --key <key>', 'Your FutureCloud License Key (opsional, akan diprompt jika tidak diisi)')
  .action(async (options) => {

    // ══ Banner ════════════════════════════════════════════════
    console.log(chalk.cyan('\n╔═══════════════════════════════════════╗'));
    console.log(chalk.cyan('║   FutureCloud Monitoring Plugin Installer  ║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════╝\n'));

    try {
      

      // ══ LANGKAH 1: License Key ═══════════════════════════════
      // Gunakan modul baru: prompt interaktif jika --key tidak diberikan.
      // Jika --key diberikan, langsung pakai (backward-compatible).
      const licenseKey = await promptLicenseKey(options.key || null);

      // ══ Verifikasi ke API ═════════════════════════════════════
      // ┌─ CATATAN BACKEND ───────────────────────────────────────┐
      // │ Diperlukan endpoint baru di monitoring-plugin-api:          │
      // │   POST /api/v1/license/verify                            │
      // │   Header: X-FutureCloud-License: <key>                  │
      // │   Response: { "valid": true, "client_name": "..." }     │
      // └────────────────────────────────────────────────────────┘
      const verification = await verifyLicenseKey(licenseKey);

      if (!verification.valid) {
        console.error(chalk.red(`\n✖ Verifikasi gagal: ${verification.message}`));
        process.exit(1);
      }

      if (verification.clientName) {
        console.log(chalk.green(`[SUCCESS] License key valid! Selamat datang, ${chalk.bold(verification.clientName)}.\n`));
      } else if (!verification.skipped) {
        console.log(chalk.green('[SUCCESS] License key berhasil diverifikasi!\n'));
      }

      // ══════════════════════════════════════════════════════════
      // ── LOGIKA EXISTING (DIPERTAHANKAN) ──────────────────────
      // Ini adalah behavior asli dari CLI sebelum penambahan fitur.
      // Tetap berjalan untuk backward-compatibility.
      // ──────────────────────────────────────────────────────────
      const templatePath = path.join(__dirname, 'templates', 'monitoring-ui.js');
      const targetPath   = path.join(process.cwd(), 'futurecloud-monitoring.js');

      if (fs.existsSync(templatePath)) {
        let templateContent = fs.readFileSync(templatePath, 'utf8');
        templateContent = templateContent.replace('__LICENSE_KEY__', licenseKey);
        templateContent = templateContent.replace('__API_URL__', API_URL);
        fs.writeFileSync(targetPath, templateContent);

        console.log(chalk.gray(`[Legacy] File universal juga dibuat: ${targetPath}`));
      }
      // ──────────────────────────────────────────────────────────
      // ── AKHIR LOGIKA EXISTING ─────────────────────────────────
      // ══════════════════════════════════════════════════════════

      // ══ LANGKAH 2: Pilih Framework ═══════════════════════════
      const frameworkMeta = await selectFramework();

      // ══ LANGKAH 3: Deploy File ke Path Framework ═════════════
      console.log(chalk.cyan('\n📂 Langkah 3: Deploy File Widget\n'));
      const { deployed, targetPath: deployedPath } = deployFile(frameworkMeta, licenseKey);

      if (!deployed) {
        console.error(chalk.red('✖ Gagal mendeploy file widget.'));
        process.exit(1);
      }

      // ══ LANGKAH 3b: Injeksi Kredensial ke .env ════════════════
      console.log(chalk.cyan('\n🔐 Injeksi Kredensial\n'));
      injectToEnv(licenseKey);

      // Jika HTML Biasa: coba injeksi script tag ke index.html
      if (frameworkMeta.name === 'HTML Biasa') {
        injectScriptTagToHtml(deployedPath);
      }

      // ══ LANGKAH 4: Auto-Routing & Panduan ════════════════════
      await runRouteAdvisor(frameworkMeta, deployedPath, licenseKey);

      // ══ LANGKAH 5: Tandai sebagai terinstal ══════════════════
      try {
        await axios.post(`${API_URL}/install`, { license_key: licenseKey });
      } catch (err) {
        // Abaikan jika gagal
      }

      // ══ Summary ═══════════════════════════════════════════════
      console.log(chalk.green('\n╔═══════════════════════════════════════╗'));
      console.log(chalk.green('║         [SUCCESS]  Instalasi Selesai!           ║'));
      console.log(chalk.green('╚═══════════════════════════════════════╝\n'));

      console.log(chalk.white('  Ringkasan:'));
      console.log(chalk.gray(`  • Framework  : ${frameworkMeta.name}`));
      console.log(chalk.gray(`  • File Widget : ${path.relative(process.cwd(), deployedPath)}`));
      console.log(chalk.gray(`  • .env        : diperbarui dengan FUTURECLOUD_LICENSE_KEY`));
      console.log(chalk.gray(`  • API URL     : ${API_URL}\n`));

      console.log(chalk.cyan('  Butuh bantuan? Jalankan perintah berikut di terminal:'));
      console.log(chalk.yellow('  futurecloud-monitoring --help\n'));

    } catch (error) {
      console.error(chalk.red('\n✖ Error selama instalasi:'), error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// ─── Parse arguments ──────────────────────────────────────────

program.parse(process.argv);

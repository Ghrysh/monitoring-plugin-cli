/**
 * lib/credentialInjector.js
 * ─────────────────────────────────────────────────────────────────
 * Modul untuk menyuntikkan License Key ke file konfigurasi proyek
 * user (.env atau script tag HTML).
 * ─────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * ┌─ KUSTOMISASI ────────────────────────────────────────────────┐
 * │ ENV_KEY_NAME: Nama variabel environment yang akan ditambahkan │
 * │ ke file .env user. Sesuaikan jika admin panel menggunakan    │
 * │ nama variabel yang berbeda.                                   │
 * └──────────────────────────────────────────────────────────────┘
 */
const ENV_KEY_NAME = 'FUTURECLOUD_LICENSE_KEY';
const API_URL_KEY_NAME = 'FUTURECLOUD_API_URL';
const API_URL_VALUE = 'https://api-monitoring.futurecloud.id/api/v1'; // ← Ganti dengan URL production

/**
 * Menyuntikkan License Key ke file .env di direktori kerja user.
 * Jika .env belum ada, file baru akan dibuat.
 * Jika key sudah ada, akan diperbarui nilainya.
 * 
 * @param {string} licenseKey - License key yang sudah diverifikasi
 * @returns {{ injected: boolean, envPath: string }}
 */
function injectToEnv(licenseKey) {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let envContent = '';
  let envExists = false;

  // Cek apakah .env sudah ada
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    envExists = true;
  }

  // ── Proses entri ENV_KEY_NAME ──────────────────────────────────
  const keyRegex = new RegExp(`^${ENV_KEY_NAME}=.*$`, 'm');
  const apiRegex = new RegExp(`^${API_URL_KEY_NAME}=.*$`, 'm');

  if (keyRegex.test(envContent)) {
    // Key sudah ada → update nilainya
    envContent = envContent.replace(keyRegex, `${ENV_KEY_NAME}=${licenseKey}`);
    console.log(chalk.yellow(`   ✏  ${ENV_KEY_NAME} diperbarui di .env`));
  } else {
    // Key belum ada → append di akhir
    const newEntry =
      `\n# === FutureCloud Monitoring Plugin ===\n` +
      `${ENV_KEY_NAME}=${licenseKey}\n` +
      `${API_URL_KEY_NAME}=${API_URL_VALUE}\n`;

    envContent += newEntry;
    console.log(chalk.green(`   [SUCCESS]  ${ENV_KEY_NAME} ditambahkan ke .env`));
  }

  // Update/buat .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  if (!envExists) {
    console.log(chalk.gray(`   [FILE] File .env baru dibuat di: ${envPath}`));
  }

  // ── Opsional: tambahkan entry ke .env.example juga ────────────
  if (fs.existsSync(envExamplePath)) {
    let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    const exampleKeyRegex = new RegExp(`^${ENV_KEY_NAME}=.*$`, 'm');

    if (!exampleKeyRegex.test(exampleContent)) {
      exampleContent +=
        `\n# === FutureCloud Monitoring Plugin ===\n` +
        `${ENV_KEY_NAME}=your_license_key_here\n` +
        `${API_URL_KEY_NAME}=${API_URL_VALUE}\n`;

      fs.writeFileSync(envExamplePath, exampleContent, 'utf8');
      console.log(chalk.gray(`   [FILE] .env.example juga diperbarui`));
    }
  }

  return { injected: true, envPath };
}

/**
 * Menyuntikkan script tag ke file HTML jika framework adalah HTML Biasa.
 * Script tag berisi referensi ke file FutureCloudMonitoring.html yang sudah digenerate.
 * 
 * @param {string} targetWidgetPath - Path absolut ke file widget yang sudah dibuat
 * @param {string} htmlFilePath - Path ke file HTML utama user (opsional, auto-detect jika null)
 */
function injectScriptTagToHtml(targetWidgetPath, htmlFilePath = null) {
  // Auto-detect file HTML jika tidak diberikan
  const htmlCandidates = ['index.html', 'public/index.html', 'dist/index.html'];
  let resolvedHtmlPath = htmlFilePath;

  if (!resolvedHtmlPath) {
    for (const candidate of htmlCandidates) {
      const candidatePath = path.join(process.cwd(), candidate);
      if (fs.existsSync(candidatePath)) {
        resolvedHtmlPath = candidatePath;
        break;
      }
    }
  }

  if (!resolvedHtmlPath || !fs.existsSync(resolvedHtmlPath)) {
    // Tidak bisa auto-detect → tampilkan panduan manual
    console.log(chalk.yellow(`\n[WARNING]  File HTML tidak ditemukan untuk injeksi otomatis.`));
    console.log(chalk.gray(`   Tambahkan baris berikut secara manual sebelum </body>:\n`));
    console.log(
      chalk.cyan(
        `   <script src="${path
          .relative(process.cwd(), targetWidgetPath)
          .replace(/\\/g, '/')}"></script>`
      )
    );
    return { injected: false };
  }

  let htmlContent = fs.readFileSync(resolvedHtmlPath, 'utf8');
  const scriptTag = `\n    <!-- FutureCloud Monitoring Plugin -->\n    <script src="${path
    .relative(path.dirname(resolvedHtmlPath), targetWidgetPath)
    .replace(/\\/g, '/')}"></script>`;

  // Cek apakah sudah ada script monitoring agar tidak duplikasi
  if (htmlContent.includes('FutureCloud Monitoring Plugin')) {
    console.log(chalk.yellow(`   [WARNING]  Script monitoring sudah ada di ${path.basename(resolvedHtmlPath)}, dilewati.`));
    return { injected: false };
  }

  // Sisipkan sebelum </body>
  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`);
    fs.writeFileSync(resolvedHtmlPath, htmlContent, 'utf8');
    console.log(chalk.green(`   [SUCCESS]  Script tag berhasil disisipkan ke: ${resolvedHtmlPath}`));
    return { injected: true, htmlPath: resolvedHtmlPath };
  }

  // Jika tidak ada </body>, append di akhir file
  htmlContent += scriptTag;
  fs.writeFileSync(resolvedHtmlPath, htmlContent, 'utf8');
  console.log(chalk.green(`   [SUCCESS]  Script tag ditambahkan ke akhir: ${resolvedHtmlPath}`));
  return { injected: true, htmlPath: resolvedHtmlPath };
}

module.exports = { injectToEnv, injectScriptTagToHtml };

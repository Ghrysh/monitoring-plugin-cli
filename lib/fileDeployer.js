/**
 * lib/fileDeployer.js
 * ─────────────────────────────────────────────────────────────────
 * Modul untuk mengambil template yang sesuai framework, melakukan
 * injeksi kredensial (LICENSE_KEY & API_URL), lalu menyimpan file
 * ke direktori target yang sesuai standar framework.
 * ─────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * ┌─ KUSTOMISASI ────────────────────────────────────────────────┐
 * │ Sesuaikan API_URL berikut dengan URL production API Anda.    │
 * │ URL ini akan diinjeksi ke dalam file widget monitoring.         │
 * └──────────────────────────────────────────────────────────────┘
 */
const API_URL = 'https://api-monitoring.futurecloud.id/api/v1';

/**
 * Mendeploy file widget monitoring ke proyek user berdasarkan framework.
 * 
 * @param {Object} frameworkMeta - Metadata framework dari frameworkSelector
 * @param {string} frameworkMeta.name        - Nama framework
 * @param {string} frameworkMeta.extension   - Ekstensi file (misal: .blade.php)
 * @param {string} frameworkMeta.targetDir   - Path direktori target relatif ke CWD
 * @param {string} frameworkMeta.templateFile - Nama file template di folder templates/
 * @param {string} licenseKey - License Key yang sudah diverifikasi
 * @returns {{ deployed: boolean, targetPath: string }}
 */
function deployFile(frameworkMeta, licenseKey) {
  const { name, targetDir, templateFile } = frameworkMeta;

  // 1. Tentukan path template
  const templatePath = path.join(__dirname, '..', 'templates', templateFile);

  if (!fs.existsSync(templatePath)) {
    // Fallback ke template JS universal jika template framework tidak ada
    console.log(
      chalk.yellow(`\n[WARNING]  Template '${templateFile}' tidak ditemukan.`) +
      chalk.gray(` Menggunakan template universal (monitoring-ui.js)...`)
    );

    return deployFallback(frameworkMeta, licenseKey);
  }

  // 2. Baca konten template
  let content = fs.readFileSync(templatePath, 'utf8');

  // 3. Injeksi placeholder — sesuaikan nama placeholder jika berbeda di template
  content = content.replace(/__LICENSE_KEY__/g, licenseKey);
  content = content.replace(/__API_URL__/g, API_URL);

  // 4. Buat direktori target jika belum ada
  const absoluteTargetDir = path.join(process.cwd(), targetDir);
  if (!fs.existsSync(absoluteTargetDir)) {
    fs.mkdirSync(absoluteTargetDir, { recursive: true });
    console.log(chalk.gray(`   [DIR] Membuat direktori: ${absoluteTargetDir}`));
  }

  // 5. Tentukan nama file output
  //    Konvensi: FutureCloudMonitoring + ekstensi framework
  const outputFilename = `FutureCloudMonitoring${frameworkMeta.extension}`;
  const targetPath = path.join(absoluteTargetDir, outputFilename);

  // 6. Tulis file
  fs.writeFileSync(targetPath, content, 'utf8');

  console.log(chalk.green(`\n[SUCCESS] File widget berhasil dibuat:`));
  console.log(chalk.white(`   ${targetPath}`));

  // 7. Deploy tracker.js
  const trackerSource = path.join(__dirname, '..', 'templates', 'tracker.js');
  if (fs.existsSync(trackerSource)) {
    let trackerContent = fs.readFileSync(trackerSource, 'utf8');
    trackerContent = trackerContent.replace('%%LICENSE_KEY%%', licenseKey);
    trackerContent = trackerContent.replace('%%API_URL%%', API_URL);

    // Tentukan direktori public
    let publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      publicDir = process.cwd(); // fallback jika tidak ada folder public (misal HTML biasa)
    }
    const futurecloudDir = path.join(publicDir, 'futurecloud');
    if (!fs.existsSync(futurecloudDir)) {
      fs.mkdirSync(futurecloudDir, { recursive: true });
    }
    const trackerDest = path.join(futurecloudDir, 'tracker.js');
    fs.writeFileSync(trackerDest, trackerContent, 'utf8');
    console.log(chalk.gray(`   [FILE] Tracker script disalin ke: ${path.relative(process.cwd(), trackerDest)}`));
  }

  return { deployed: true, targetPath };
}

/**
 * Fallback: Deploy file JS universal jika template framework tidak ditemukan.
 * Ini mempertahankan behavior existing (monitoring-ui.js → futurecloud-monitoring.js).
 * 
 * @param {Object} frameworkMeta
 * @param {string} licenseKey
 */
function deployFallback(frameworkMeta, licenseKey) {
  // ── Logika existing dipertahankan ──────────────────────────────
  const templatePath = path.join(__dirname, '..', 'templates', 'monitoring-ui.js');
  const targetPath = path.join(process.cwd(), 'futurecloud-monitoring.js');

  if (!fs.existsSync(templatePath)) {
    console.error(chalk.red('Error: Template file tidak ditemukan.'));
    process.exit(1);
  }

  let templateContent = fs.readFileSync(templatePath, 'utf8');
  templateContent = templateContent.replace('__LICENSE_KEY__', licenseKey);
  templateContent = templateContent.replace('__API_URL__', API_URL);
  fs.writeFileSync(targetPath, templateContent);

  console.log(chalk.green(`\n[SUCCESS] File widget (fallback) berhasil dibuat:`));
  console.log(chalk.white(`   ${targetPath}`));

  return { deployed: true, targetPath };
}

module.exports = { deployFile };

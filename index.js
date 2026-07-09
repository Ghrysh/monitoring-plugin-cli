#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// HELPER: PRINT USAGE GUIDE
// ==========================================
function printUsageGuide() {
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║       FUTURECLOUD MONITORING CLI v1.2.0      ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════╝\n'));
  console.log(chalk.white.bold('Cara penggunaan:\n'));
  console.log(chalk.yellow('  fc -cb install             ') + chalk.gray('# Install plugin (muncul semua prompt)'));
  console.log(chalk.yellow('  fc -cb install --key FC-XX ') + chalk.gray('# Install dengan license key langsung'));
  console.log(chalk.yellow('  fc -cb -v                  ') + chalk.gray('# Tampilkan versi: 1.2.0'));
  console.log(chalk.yellow('  fc -cb --help              ') + chalk.gray('# Tampilkan bantuan lengkap'));
  console.log('\n' + chalk.gray('  Framework yang didukung: Laravel | React | Vue | HTML Biasa'));
  console.log('');
}

function printHelpDetails() {
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║         FUTURECLOUD CLI - BANTUAN LENGKAP    ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════╝\n'));
  console.log(chalk.white.bold('Perintah tersedia:\n'));
  console.log(chalk.green('  install                    ') + chalk.white('Memulai wizard instalasi plugin ke project Anda.'));
  console.log(chalk.green('  install --key <key>        ') + chalk.white('Instalasi cepat menggunakan License Key langsung.'));
  console.log(chalk.green('  -v, --version              ') + chalk.white('Tampilkan versi rilis plugin.'));
  console.log(chalk.green('  --help, -h                 ') + chalk.white('Tampilkan bantuan menu ini.\n'));
  console.log(chalk.white.bold('Framework yang didukung:\n'));
  console.log(chalk.blue('  Laravel    ') + chalk.white('→ Buat file .blade.php di resources/views/vendor/futurecloud/'));
  console.log(chalk.blue('  React      ') + chalk.white('→ Buat file .jsx di src/components/futurecloud/'));
  console.log(chalk.blue('  Vue        ') + chalk.white('→ Buat file .vue di src/components/futurecloud/'));
  console.log(chalk.blue('  HTML Biasa ') + chalk.white('→ Buat file .html di public/futurecloud/'));
  console.log('');
}

// ==========================================
// MAIN INSTALLER
// ==========================================
async function runInstaller(passedKey) {
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║    FUTURECLOUD MONITORING PLUGIN INSTALLER   ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════╝\n'));

  // ── STEP 1: LICENSE KEY ──────────────────────────────
  let licenseKey = passedKey;

  if (!licenseKey) {
    const keyPrompt = await inquirer.prompt([
      {
        type: 'input',
        name: 'licenseKey',
        message: chalk.cyan('🔑 Masukkan License Key FutureCloud Anda:'),
        validate: input => input.trim() ? true : chalk.red('License Key wajib diisi!')
      }
    ]);
    licenseKey = keyPrompt.licenseKey.trim();
  } else {
    console.log(chalk.green(`✔ License Key diterima dari flag CLI: ${chalk.bold(licenseKey)}`));
  }

  // ── STEP 2: API URL & FRAMEWORK ─────────────────────
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: chalk.cyan('🌐 Masukkan URL API FutureCloud Anda:'),
      default: 'http://localhost:8000/api/v1',
      validate: input => input.trim() ? true : chalk.red('API URL wajib diisi!')
    },
    {
      type: 'list',
      name: 'framework',
      message: chalk.cyan('🧱 Framework apa yang Anda gunakan?'),
      choices: [
        { name: '🟠 Laravel   (.blade.php)', value: 'Laravel' },
        { name: '🔵 React     (.jsx)', value: 'React' },
        { name: '🟢 Vue       (.vue)', value: 'Vue' },
        { name: '⚪ HTML Biasa (.html)', value: 'HTML Biasa' },
      ]
    }
  ]);

  const { framework, apiUrl } = answers;
  const projectDir = process.cwd();

  // Deteksi otomatis: Next.js atau Vite
  let isNextJs = false;
  let isVite = false;

  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = await fs.readJson(packageJsonPath);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.next)  isNextJs = true;
      if (allDeps.vite)  isVite   = true;
    } catch (e) { /* abaikan */ }
  }

  // ── STEP 3: CREDENTIAL INJECTION ────────────────────
  console.log(chalk.bold('\n┌─────────────────────────────────────────────┐'));
  console.log(chalk.bold('│  [1/3] Injeksi Kredensial & License Key     │'));
  console.log(chalk.bold('└─────────────────────────────────────────────┘'));

  // Tentukan nama env variable berdasarkan framework/builder
  let envKeyName = 'FUTURECLOUD_LICENSE_KEY';
  let envApiName = 'FUTURECLOUD_API_URL';

  if (isNextJs) {
    envKeyName = 'NEXT_PUBLIC_FUTURECLOUD_LICENSE_KEY';
    envApiName = 'NEXT_PUBLIC_FUTURECLOUD_API_URL';
  } else if (isVite) {
    envKeyName = 'VITE_FUTURECLOUD_LICENSE_KEY';
    envApiName = 'VITE_FUTURECLOUD_API_URL';
  }

  // Untuk HTML Biasa: tidak ada .env → buat config JS terpisah
  if (framework === 'HTML Biasa') {
    const htmlConfigDir = path.join(projectDir, 'public', 'futurecloud');
    await fs.ensureDir(htmlConfigDir);
    const htmlConfigPath = path.join(htmlConfigDir, 'futurecloud.config.js');
    const htmlConfigContent =
`// FutureCloud Plugin Configuration
// File ini di-generate otomatis oleh FutureCloud CLI
// JANGAN commit file ini ke repository publik!
window.FUTURECLOUD_CONFIG = {
  LICENSE_KEY: "${licenseKey}",
  API_URL: "${apiUrl}"
};
`;
    await fs.writeFile(htmlConfigPath, htmlConfigContent, 'utf8');
    console.log(chalk.green(`✔ Konfigurasi key disimpan di: public/futurecloud/futurecloud.config.js`));
  } else {
    // Untuk Laravel / React / Vue → tulis ke .env
    const envCandidates = ['.env', '.env.local', '.env.development'];
    let envInjected = false;

    for (const envFile of envCandidates) {
      const envPath = path.join(projectDir, envFile);
      if (fs.existsSync(envPath)) {
        let content = await fs.readFile(envPath, 'utf8');

        // Inject / update License Key
        if (!content.includes(envKeyName)) {
          content += (content.endsWith('\n') ? '' : '\n') + `${envKeyName}="${licenseKey}"\n`;
        } else {
          content = content.replace(new RegExp(`${envKeyName}=.*`, 'g'), `${envKeyName}="${licenseKey}"`);
        }

        // Inject / update API URL
        if (!content.includes(envApiName)) {
          content += (content.endsWith('\n') ? '' : '\n') + `${envApiName}="${apiUrl}"\n`;
        } else {
          content = content.replace(new RegExp(`${envApiName}=.*`, 'g'), `${envApiName}="${apiUrl}"`);
        }

        await fs.writeFile(envPath, content, 'utf8');
        console.log(chalk.green(`✔ License Key & API URL berhasil disuntikkan ke ${chalk.bold(envFile)}`));
        envInjected = true;
        break; // Cukup satu file .env
      }
    }

    if (!envInjected) {
      // Tidak ada .env → buat baru
      const newEnvPath = path.join(projectDir, '.env');
      await fs.writeFile(newEnvPath, `${envKeyName}="${licenseKey}"\n${envApiName}="${apiUrl}"\n`, 'utf8');
      console.log(chalk.green(`✔ File .env baru dibuat dengan License Key & API URL`));
    }
  }

  // ── STEP 4: EKSTRAKSI FILE UI PER FRAMEWORK ─────────
  console.log(chalk.bold('\n┌─────────────────────────────────────────────┐'));
  console.log(chalk.bold('│  [2/3] Ekstraksi File Plugin ke Framework   │'));
  console.log(chalk.bold('└─────────────────────────────────────────────┘'));

  const coreTrackerPath = path.join(__dirname, 'templates', 'tracker.js');
  if (!fs.existsSync(coreTrackerPath)) {
    console.error(chalk.red('❌ Error: File templates/tracker.js tidak ditemukan!'));
    return;
  }

  const rawCode = await fs.readFile(coreTrackerPath, 'utf8');

  // Ganti placeholder __LICENSE_KEY__ dan __API_URL__ di script
  const trackerCode = rawCode
    .replace(/__LICENSE_KEY__/g, licenseKey)
    .replace(/__API_URL__/g, apiUrl);

  let targetFolder   = '';
  let targetFileName = '';
  let finalContent   = '';

  switch (framework) {

    // ── LARAVEL → .blade.php ───────────────────────────
    case 'Laravel':
      targetFolder   = path.join(projectDir, 'resources', 'views', 'vendor', 'futurecloud');
      targetFileName = 'futurecloud-plugin.blade.php';
      finalContent   =
`{{-- FutureCloud Monitoring Plugin --}}
{{-- Di-generate otomatis oleh FutureCloud CLI --}}
{{-- Pasang di layout utama dengan: @include('vendor.futurecloud.futurecloud-plugin') --}}
<script>
${trackerCode}
</script>
`;
      break;

    // ── REACT → .jsx ──────────────────────────────────
    case 'React':
      targetFolder   = path.join(projectDir, 'src', 'components', 'futurecloud');
      targetFileName = 'FuturecloudPlugin.jsx';
      finalContent   =
`// FutureCloud Monitoring Plugin
// Di-generate otomatis oleh FutureCloud CLI
// Pasang di layout utama: <FuturecloudPlugin />
import { useEffect } from 'react';

export default function FuturecloudPlugin() {
  useEffect(() => {
    (function() {
      ${trackerCode.replace(/\n/g, '\n      ')}
    })();
  }, []);
  return null;
}
`;
      break;

    // ── VUE → .vue (Composition API + Options API) ────
    case 'Vue':
      targetFolder   = path.join(projectDir, 'src', 'components', 'futurecloud');
      targetFileName = 'FuturecloudPlugin.vue';
      finalContent   =
`<!-- FutureCloud Monitoring Plugin -->
<!-- Di-generate otomatis oleh FutureCloud CLI -->
<!-- Pasang di App.vue: <FuturecloudPlugin /> -->
<template><!-- Plugin berjalan di background --></template>

<script>
export default {
  name: 'FuturecloudPlugin',
  mounted() {
    (function() {
      ${trackerCode.replace(/\n/g, '\n      ')}
    })();
  }
}
</script>
`;
      break;

    // ── HTML BIASA → .html ────────────────────────────
    case 'HTML Biasa':
      targetFolder   = path.join(projectDir, 'public', 'futurecloud');
      targetFileName = 'futurecloud-plugin.html';
      finalContent   =
`<!-- FutureCloud Monitoring Plugin -->
<!-- Di-generate otomatis oleh FutureCloud CLI -->
<!-- Salin tag <script> ini ke bagian bawah <body> halaman Anda -->
<script src="./futurecloud.config.js"></script>
<script>
${trackerCode}
</script>
`;
      break;
  }

  await fs.ensureDir(targetFolder);
  const destPath = path.join(targetFolder, targetFileName);
  await fs.writeFile(destPath, finalContent, 'utf8');
  console.log(chalk.green(`✔ File plugin [${chalk.bold(targetFileName)}] berhasil dibuat di:`));
  console.log(chalk.gray(`   → ${destPath}`));

  // ── STEP 5: AUTO-ROUTING ────────────────────────────
  console.log(chalk.bold('\n┌─────────────────────────────────────────────┐'));
  console.log(chalk.bold('│  [3/3] Konfigurasi Auto-Routing             │'));
  console.log(chalk.bold('└─────────────────────────────────────────────┘'));

  if (framework === 'Laravel') {
    // Auto-routing Laravel: tambah Route::view() ke routes/web.php
    const webRoutePath = path.join(projectDir, 'routes', 'web.php');
    if (fs.existsSync(webRoutePath)) {
      let routeContent = await fs.readFile(webRoutePath, 'utf8');
      if (!routeContent.includes('futurecloud-monitoring')) {
        const prefix = routeContent.endsWith('\n') ? '' : '\n';
        const routeSnippet =
`${prefix}
// ─── Route otomatis dari FutureCloud CLI ───────────────
Route::view('/futurecloud-monitoring', 'vendor.futurecloud.futurecloud-plugin');
`;
        await fs.appendFile(webRoutePath, routeSnippet);
        console.log(chalk.green('✔ Route /futurecloud-monitoring ditambahkan ke routes/web.php'));
      } else {
        console.log(chalk.blue('ℹ  Route /futurecloud-monitoring sudah ada di routes/web.php'));
      }
    } else {
      console.log(chalk.gray('ℹ  routes/web.php tidak ditemukan. Lewati auto-routing.'));
    }

  } else if (framework === 'React' && isNextJs) {
    // Auto-routing Next.js: buat halaman demo otomatis
    const appDir   = path.join(projectDir, 'app');
    const pagesDir = path.join(projectDir, 'pages');

    if (fs.existsSync(appDir)) {
      // App Router (Next.js 13+)
      const demoDir  = path.join(appDir, 'futurecloud-demo');
      await fs.ensureDir(demoDir);
      const demoPage = path.join(demoDir, 'page.jsx');
      if (!fs.existsSync(demoPage)) {
        await fs.writeFile(demoPage,
`'use client';
import FuturecloudPlugin from '../../src/components/futurecloud/FuturecloudPlugin';

export default function FuturecloudDemoPage() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#4f46e5' }}>FutureCloud Plugin Aktif ✔</h1>
      <p style={{ color: '#64748b' }}>
        Perhatikan sudut kanan bawah untuk melihat widget AI Chatbot.
      </p>
      <FuturecloudPlugin />
    </div>
  );
}
`, 'utf8');
        console.log(chalk.green('✔ Halaman demo Next.js (App Router) dibuat di: app/futurecloud-demo/page.jsx'));
        console.log(chalk.green('✔ Rute tersedia di: /futurecloud-demo'));
      } else {
        console.log(chalk.blue('ℹ  Halaman /futurecloud-demo sudah ada.'));
      }

    } else if (fs.existsSync(pagesDir)) {
      // Pages Router (Next.js 12 ke bawah)
      const demoPage = path.join(pagesDir, 'futurecloud-demo.jsx');
      if (!fs.existsSync(demoPage)) {
        await fs.writeFile(demoPage,
`import FuturecloudPlugin from '../src/components/futurecloud/FuturecloudPlugin';

export default function FuturecloudDemoPage() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#4f46e5' }}>FutureCloud Plugin Aktif ✔</h1>
      <p style={{ color: '#64748b' }}>
        Perhatikan sudut kanan bawah untuk melihat widget AI Chatbot.
      </p>
      <FuturecloudPlugin />
    </div>
  );
}
`, 'utf8');
        console.log(chalk.green('✔ Halaman demo Next.js (Pages Router) dibuat di: pages/futurecloud-demo.jsx'));
        console.log(chalk.green('✔ Rute tersedia di: /futurecloud-demo'));
      } else {
        console.log(chalk.blue('ℹ  Halaman /futurecloud-demo sudah ada.'));
      }
    }

  } else if (framework === 'Vue' && isVite) {
    // Vue + Vite: tambah route ke router/index.js jika ada
    const routerPath = path.join(projectDir, 'src', 'router', 'index.js');
    if (fs.existsSync(routerPath)) {
      let routerContent = await fs.readFile(routerPath, 'utf8');
      if (!routerContent.includes('futurecloud-demo')) {
        // Cari posisi array routes: [] dan sisipkan route baru
        const routeEntry =
`  {
    path: '/futurecloud-demo',
    name: 'FuturecloudDemo',
    component: () => import('../components/futurecloud/FuturecloudPlugin.vue')
  },`;
        // Sisipkan setelah pembuka [ di array routes
        routerContent = routerContent.replace(
          /routes:\s*\[/,
          `routes: [\n${routeEntry}`
        );
        await fs.writeFile(routerPath, routerContent, 'utf8');
        console.log(chalk.green('✔ Route /futurecloud-demo ditambahkan ke src/router/index.js'));
      } else {
        console.log(chalk.blue('ℹ  Route /futurecloud-demo sudah ada di router.'));
      }
    } else {
      console.log(chalk.gray('ℹ  src/router/index.js tidak ditemukan. Lewati auto-routing Vue.'));
    }

  } else {
    console.log(chalk.gray('ℹ  Auto-routing tidak tersedia untuk kombinasi ini.'));
  }

  // ── STEP 6: PANDUAN INTEGRASI ───────────────────────
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.green.bold('║       INSTALASI PLUGIN SELESAI! 🎉          ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════╝\n'));

  console.log(chalk.white.bold('📋 Panduan integrasi ke website Anda:\n'));

  if (framework === 'Laravel') {
    console.log(chalk.white('1. Buka file layout utama Blade Anda (misal: resources/views/layouts/app.blade.php)'));
    console.log(chalk.magenta('   Tambahkan sebelum </body>:'));
    console.log(chalk.cyan("   @include('vendor.futurecloud.futurecloud-plugin')\n"));
    console.log(chalk.white('2. Akses halaman verifikasi di browser:'));
    console.log(chalk.cyan('   http://localhost:8000/futurecloud-monitoring\n'));
    console.log(chalk.white('3. Dashboard monitoring tersedia di:'));
    console.log(chalk.cyan('   http://localhost:8000/dashboard\n'));

  } else if (framework === 'React') {
    console.log(chalk.white('1. Import komponen di file layout utama Anda (misal: src/App.jsx):'));
    console.log(chalk.cyan("   import FuturecloudPlugin from './components/futurecloud/FuturecloudPlugin';\n"));
    console.log(chalk.white('2. Render di dalam return/JSX (sebelum </div> penutup):'));
    console.log(chalk.cyan('   <FuturecloudPlugin />\n'));
    if (isNextJs) {
      console.log(chalk.white('3. Akses halaman verifikasi di browser:'));
      console.log(chalk.cyan('   http://localhost:3000/futurecloud-demo\n'));
    }

  } else if (framework === 'Vue') {
    console.log(chalk.white('1. Import komponen di file App.vue:'));
    console.log(chalk.cyan("   import FuturecloudPlugin from './components/futurecloud/FuturecloudPlugin.vue';\n"));
    console.log(chalk.white('2. Daftarkan di components dan render:'));
    console.log(chalk.cyan('   components: { FuturecloudPlugin }'));
    console.log(chalk.cyan('   <FuturecloudPlugin />\n'));
    if (isVite) {
      console.log(chalk.white('3. Akses halaman verifikasi di browser:'));
      console.log(chalk.cyan('   http://localhost:5173/futurecloud-demo\n'));
    }

  } else if (framework === 'HTML Biasa') {
    console.log(chalk.white('1. Salin kedua tag script ini sebelum </body> di setiap halaman HTML:'));
    console.log(chalk.cyan('   <script src="/futurecloud/futurecloud.config.js"></script>'));
    console.log(chalk.cyan('   <script src="/futurecloud/futurecloud-plugin.html"></script>\n'));
    console.log(chalk.white('   Atau copy langsung isi futurecloud-plugin.html ke halaman Anda.\n'));
  }

  console.log(chalk.gray('━'.repeat(48)));
  console.log(chalk.white(`🔑 License Key : ${chalk.bold(licenseKey)}`));
  console.log(chalk.white(`🌐 API URL     : ${chalk.bold(apiUrl)}`));
  console.log(chalk.white(`🧱 Framework   : ${chalk.bold(framework)}`));
  console.log(chalk.gray('━'.repeat(48)));
  console.log('');
}

// ==========================================
// ENTRY POINT
// ==========================================
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsageGuide();
    process.exit(0);
  }

  if (args[0] !== '-cb') {
    console.error(chalk.red(`\n❌ Opsi tidak dikenal: "${args[0]}"`));
    printUsageGuide();
    process.exit(1);
  }

  const sub = args[1];

  if (sub === '-v' || sub === '--version' || sub === '-V') {
    console.log('1.2.0');
    process.exit(0);
  }

  if (sub === '--help' || sub === '-h') {
    printHelpDetails();
    process.exit(0);
  }

  if (sub === 'install') {
    let keyIndex = args.indexOf('--key');
    if (keyIndex === -1) keyIndex = args.indexOf('-k');
    const key = (keyIndex !== -1 && args[keyIndex + 1]) ? args[keyIndex + 1] : null;
    await runInstaller(key);
    process.exit(0);
  }

  console.error(chalk.red(`\n❌ Subcommand tidak dikenal: "${sub || ''}"`));
  printUsageGuide();
  process.exit(1);
}

main().catch(err => {
  console.error(chalk.red('\n❌ Terjadi kesalahan fatal:'), err.message);
  process.exit(1);
});

#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define program info using commander
program
  .name('futurecloud-monitoring')
  .description('FutureCloud visitor monitoring, AI chatbot, and Live Support plugin installer CLI')
  .version('1.0.0');

// Register 'install' command
program
  .command('install')
  .description('Install the monitoring tracker and interactive dashboard to your project')
  .option('-k, --key <key>', 'Your FutureCloud License Key (bypasses prompt if provided)')
  .action(async (options) => {
    await runInstaller(options.key);
  });

// Parse CLI arguments
program.parse(process.argv);

async function runInstaller(passedKey) {
  console.log(chalk.cyan.bold('\n================================================'));
  console.log(chalk.cyan.bold('    FUTURECLOUD MONITORING PLUGIN CLI INSTALLER  '));
  console.log(chalk.cyan.bold('================================================\n'));

  let licenseKey = passedKey;

  // 1. Resolve License Key: Prompt only if not provided in CLI options
  if (!licenseKey) {
    const keyPrompt = await inquirer.prompt([
      {
        type: 'input',
        name: 'licenseKey',
        message: 'Masukkan License Key FutureCloud Customer:',
        validate: input => input.trim() ? true : 'License Key wajib diisi!'
      }
    ]);
    licenseKey = keyPrompt.licenseKey;
  } else {
    console.log(chalk.green(`✔ Menggunakan License Key dari flag CLI: ${licenseKey}`));
  }

  // 2. Prompt Input API URL & Pilihan Framework
  const remainingPrompts = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'Masukkan API URL FutureCloud:',
      default: 'http://localhost:8000/api/v1'
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Framework apa yang Anda gunakan?',
      choices: ['Laravel', 'React', 'Vue', 'HTML Biasa']
    }
  ]);

  const { framework, apiUrl } = remainingPrompts;
  const projectDir = process.cwd(); // Path root project customer tempat CLI dijalankan

  // Detect Next.js or Vite configurations
  let isNextJs = false;
  let isVite = false;
  
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = await fs.readJson(packageJsonPath);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.next) isNextJs = true;
      if (allDeps.vite) isVite = true;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Determine correct environment variable names based on framework/builder
  let envVarName = 'FUTURECLOUD_LICENSE_KEY';
  let envApiVarName = 'FUTURECLOUD_API_URL';
  
  if (isNextJs) {
    envVarName = 'NEXT_PUBLIC_FUTURECLOUD_LICENSE_KEY';
    envApiVarName = 'NEXT_PUBLIC_FUTURECLOUD_API_URL';
  } else if (isVite) {
    envVarName = 'VITE_FUTURECLOUD_LICENSE_KEY';
    envApiVarName = 'VITE_FUTURECLOUD_API_URL';
  }

  // 3. Injeksi Kredensial (Key & API URL) ke .env / .env.local (Jika file .env ada di project customer)
  console.log(chalk.yellow('\n[1/3] Menyelaraskan kredensial...'));
  
  const envFiles = ['.env', '.env.local', '.env.development'];
  let envInjected = false;

  for (const envFile of envFiles) {
    const envPath = path.join(projectDir, envFile);
    if (fs.existsSync(envPath)) {
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Manage License Key
      if (!envContent.includes(envVarName)) {
        const prefix = envContent.endsWith('\n') || envContent.trim() === '' ? '' : '\n';
        envContent += `${prefix}${envVarName}="${licenseKey}"\n`;
      } else {
        const regex = new RegExp(`${envVarName}=.*`, 'g');
        envContent = envContent.replace(regex, `${envVarName}="${licenseKey}"`);
      }

      // Manage API URL
      if (!envContent.includes(envApiVarName)) {
        const prefix = envContent.endsWith('\n') || envContent.trim() === '' ? '' : '\n';
        envContent += `${prefix}${envApiVarName}="${apiUrl}"\n`;
      } else {
        const regex = new RegExp(`${envApiVarName}=.*`, 'g');
        envContent = envContent.replace(regex, `${envApiVarName}="${apiUrl}"`);
      }

      await fs.writeFile(envPath, envContent, 'utf8');
      console.log(chalk.green(`✔ Kredensial berhasil disuntikkan ke ${envFile}`));
      envInjected = true;
    }
  }

  if (!envInjected) {
    // If no .env file exists, create a default .env with both credentials
    const envPath = path.join(projectDir, '.env');
    await fs.writeFile(envPath, `${envVarName}="${licenseKey}"\n${envApiVarName}="${apiUrl}"\n`, 'utf8');
    console.log(chalk.green(`✔ File .env baru berhasil dibuat dengan Kredensial`));
  }

  // 4. Membaca Core tracker.js & Transformasi ke Ekstensi UI Target
  console.log(chalk.yellow('[2/3] Memproses ekstraksi file UI komponen...'));
  const coreTrackerPath = path.join(__dirname, 'templates', 'tracker.js');

  if (!fs.existsSync(coreTrackerPath)) {
    console.error(chalk.red('❌ Error: File templates/tracker.js tidak ditemukan!'));
    return;
  }

  let coreCode = await fs.readFile(coreTrackerPath, 'utf8');
  
  // Inject license key and API URL inside tracker.js placeholders dynamically
  const processedTrackerCode = coreCode
    .replace(/__LICENSE_KEY__/g, licenseKey)
    .replace(/__API_URL__/g, apiUrl);

  // Prepended config for global scope matching supervisor specifications
  const injectedCode = `// FutureCloud Plugin Configuration\nconst FUTURECLOUD_KEY = "${licenseKey}";\nconst FUTURECLOUD_API = "${apiUrl}";\n\n${processedTrackerCode}`;

  let targetFolder = '';
  let targetFileName = '';
  let finalFileContent = '';

  switch (framework) {
    case 'Laravel':
      targetFolder = path.join(projectDir, 'resources/views/vendor/futurecloud');
      targetFileName = 'futurecloud-plugin.blade.php';
      finalFileContent = `<script>\n${injectedCode}\n</script>`;
      break;

    case 'React':
      targetFolder = path.join(projectDir, 'src/components/futurecloud');
      targetFileName = 'FuturecloudPlugin.jsx';
      finalFileContent = `import React, { useEffect } from 'react';\n\nexport default function FuturecloudPlugin() {\n  useEffect(() => {\n    ${injectedCode.replace(/\n/g, '\n    ')}\n  }, []);\n  return null;\n}`;
      break;

    case 'Vue':
      targetFolder = path.join(projectDir, 'src/components/futurecloud');
      targetFileName = 'FuturecloudPlugin.vue';
      finalFileContent = `<template></template>\n<script>\nexport default {\n  name: 'FuturecloudPlugin',\n  mounted() {\n    ${injectedCode.replace(/\n/g, '\n    ')}\n  }\n}\n</script>`;
      break;

    case 'HTML Biasa':
      targetFolder = path.join(projectDir, 'public/futurecloud');
      targetFileName = 'futurecloud-plugin.html';
      finalFileContent = `<script>\n${injectedCode}\n</script>`;
      break;
  }

  // Tulis file ke direktori target project customer
  await fs.ensureDir(targetFolder);
  const destinationPath = path.join(targetFolder, targetFileName);
  await fs.writeFile(destinationPath, finalFileContent, 'utf8');
  console.log(chalk.green(`✔ Sukses mengekstrak komponen ke: ${destinationPath}`));

  // 5. Auto-Routing untuk Laravel & Next.js
  console.log(chalk.yellow('[3/3] Memeriksa konfigurasi routing otomatis...'));
  
  if (framework === 'Laravel') {
    const webRoutePath = path.join(projectDir, 'routes/web.php');
    if (fs.existsSync(webRoutePath)) {
      let routeContent = await fs.readFile(webRoutePath, 'utf8');
      if (!routeContent.includes('/futurecloud-monitoring')) {
        // Safe check: make sure route file ends in a newline before appending
        const prefix = routeContent.endsWith('\n') ? '' : '\n';
        const routeSnippet = `${prefix}\n// Route otomatis dari FutureCloud CLI\nRoute::view('/futurecloud-monitoring', 'vendor.futurecloud.futurecloud-plugin');\n`;
        await fs.appendFile(webRoutePath, routeSnippet);
        console.log(chalk.green('✔ Endpoint /futurecloud-monitoring berhasil ditambahkan ke routes/web.php'));
      } else {
        console.log(chalk.blue('ℹ Endpoint /futurecloud-monitoring sudah ada di routes/web.php'));
      }
    } else {
      console.log(chalk.gray('ℹ routes/web.php tidak ditemukan. Dilewati.'));
    }
  } else if (framework === 'React' && isNextJs) {
    // Next.js routing automation (App Router vs Pages Router)
    const appDir = path.join(projectDir, 'app');
    const pagesDir = path.join(projectDir, 'pages');
    
    if (fs.existsSync(appDir)) {
      const demoPageDir = path.join(appDir, 'futurecloud-demo');
      await fs.ensureDir(demoPageDir);
      const demoPagePath = path.join(demoPageDir, 'page.jsx');
      const demoContent = `'use client';\n\nimport React from 'react';\nimport FuturecloudPlugin from '../../src/components/futurecloud/FuturecloudPlugin';\n\nexport default function FuturecloudDemoPage() {\n  return (\n    <div style={{\n      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif',\n      padding: '4rem 2rem',\n      maxWidth: '600px',\n      margin: '0 auto',\n      textAlign: 'center',\n      color: '#334155'\n    }}>\n      <h1 style={{ color: '#4f46e5', fontSize: '2.25rem', marginBottom: '1rem' }}>FutureCloud Demo Page</h1>\n      <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '2rem' }}>\n        Plugin monitoring, AI chatbot, dan Live Chat berhasil diintegrasikan pada rute ini.\n      </p>\n      <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>\n        Perhatikan sudut kanan bawah halaman untuk melihat floating widget.\n      </div>\n      <FuturecloudPlugin />\n    </div>\n  );\n}\n`;
      await fs.writeFile(demoPagePath, demoContent, 'utf8');
      console.log(chalk.green(`✔ Halaman demo Next.js App Router dibuat di: ${demoPagePath}`));
      console.log(chalk.green(`✔ Rute baru tersedia di: /futurecloud-demo`));
    } else if (fs.existsSync(pagesDir)) {
      const demoPagePath = path.join(pagesDir, 'futurecloud-demo.jsx');
      const demoContent = `import React from 'react';\nimport FuturecloudPlugin from '../src/components/futurecloud/FuturecloudPlugin';\n\nexport default function FuturecloudDemoPage() {\n  return (\n    <div style={{\n      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif',\n      padding: '4rem 2rem',\n      maxWidth: '600px',\n      margin: '0 auto',\n      textAlign: 'center',\n      color: '#334155'\n    }}>\n      <h1 style={{ color: '#4f46e5', fontSize: '2.25rem', marginBottom: '1rem' }}>FutureCloud Demo Page</h1>\n      <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '2rem' }}>\n        Plugin monitoring, AI chatbot, dan Live Chat berhasil diintegrasikan pada rute ini.\n      </p>\n      <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>\n        Perhatikan sudut kanan bawah halaman untuk melihat floating widget.\n      </div>\n      <FuturecloudPlugin />\n    </div>\n  );\n}\n`;
      await fs.writeFile(demoPagePath, demoContent, 'utf8');
      console.log(chalk.green(`✔ Halaman demo Next.js Pages Router dibuat di: ${demoPagePath}`));
      console.log(chalk.green(`✔ Rute baru tersedia di: /futurecloud-demo`));
    }
  } else {
    console.log(chalk.gray('ℹ Konfigurasi auto-routing dilewati untuk framework ini.'));
  }

  // 6. Cetak Output Panduan Integrasi Akhir
  console.log(chalk.cyan.bold('\n================================================'));
  console.log(chalk.green.bold('       PROSES INSTALASI PLUGIN SELESAI! 🎉      '));
  console.log(chalk.cyan.bold('================================================\n'));
  console.log(chalk.white('Gunakan panduan ini di template/layout website Anda:'));

  if (framework === 'Laravel') {
    console.log(chalk.magenta('-> Pasang di main layout Blade: @include(\'vendor.futurecloud.futurecloud-plugin\')'));
    console.log(chalk.magenta('-> Kunjungi halaman monitoring demo di browser Anda: /futurecloud-monitoring'));
  } else if (framework === 'React') {
    console.log(chalk.magenta('-> Import di App.jsx: import FuturecloudPlugin from \'./components/futurecloud/FuturecloudPlugin\';'));
    console.log(chalk.magenta('-> Render di layout: <FuturecloudPlugin />'));
    if (isNextJs) {
      console.log(chalk.magenta('-> Kunjungi rute demo di browser: /futurecloud-demo'));
    }
  } else if (framework === 'Vue') {
    console.log(chalk.magenta('-> Import di App.vue: import FuturecloudPlugin from \'./components/futurecloud/FuturecloudPlugin.vue\';'));
    console.log(chalk.magenta('-> Daftarkan dan render: <FuturecloudPlugin />'));
  } else {
    console.log(chalk.magenta('-> Salin file html tersebut atau panggil menggunakan tag script sebelum tag </body>'));
  }
  console.log('\n');
}

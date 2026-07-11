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

  // 7. Auto-Generate Halaman Admin Dashboard
  let adminContent = '';
  let adminFilename = '';
  let adminTargetDir = path.join(process.cwd(), targetDir);

  if (frameworkMeta.name === 'React') {
    adminFilename = 'FutureCloudAdmin.jsx';
    adminContent = `import React, { useState } from 'react';

const FutureCloudAdmin = ({ licenseKey = '${licenseKey}' }) => {
  const [activeTab, setActiveTab] = useState('monitoring');

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Panel Admin Customer Support</h1>
          
          <div className="mb-4 border-b border-gray-200">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
              <li className="mr-2">
                <button 
                  onClick={() => setActiveTab('monitoring')} 
                  className={\`inline-block p-4 border-b-2 rounded-t-lg \${activeTab === 'monitoring' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'}\`}
                >
                  Setup Monitoring
                </button>
              </li>
              <li className="mr-2">
                <button 
                  onClick={() => setActiveTab('livechat')} 
                  className={\`inline-block p-4 border-b-2 rounded-t-lg \${activeTab === 'livechat' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'}\`}
                >
                  Live Chat CS
                </button>
              </li>
            </ul>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {activeTab === 'monitoring' && (
              <iframe src={\`https://api-monitoring.futurecloud.id/embed/monitoring?license=\${licenseKey}\`} width="100%" height="800px" style={{border: 'none'}}></iframe>
            )}
            {activeTab === 'livechat' && (
              <iframe src={\`https://api-monitoring.futurecloud.id/embed/livechat?license=\${licenseKey}\`} width="100%" height="800px" style={{border: 'none'}}></iframe>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FutureCloudAdmin;`;
  } else if (frameworkMeta.name === 'Vue') {
    adminFilename = 'FutureCloudAdmin.vue';
    adminContent = `<template>
  <div class="bg-gray-50 min-h-screen font-sans">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Panel Admin Customer Support</h1>
        
        <div class="mb-4 border-b border-gray-200">
          <ul class="flex flex-wrap -mb-px text-sm font-medium text-center">
            <li class="mr-2">
              <button 
                @click="activeTab = 'monitoring'" 
                :class="activeTab === 'monitoring' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'"
                class="inline-block p-4 border-b-2 rounded-t-lg"
              >
                Setup Monitoring
              </button>
            </li>
            <li class="mr-2">
              <button 
                @click="activeTab = 'livechat'" 
                :class="activeTab === 'livechat' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'"
                class="inline-block p-4 border-b-2 rounded-t-lg"
              >
                Live Chat CS
              </button>
            </li>
          </ul>
        </div>
        
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div v-show="activeTab === 'monitoring'">
            <iframe :src="\`https://api-monitoring.futurecloud.id/embed/monitoring?license=\${licenseKey}\`" width="100%" height="800px" style="border:none;"></iframe>
          </div>
          <div v-show="activeTab === 'livechat'">
            <iframe :src="\`https://api-monitoring.futurecloud.id/embed/livechat?license=\${licenseKey}\`" width="100%" height="800px" style="border:none;"></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  licenseKey: {
    type: String,
    default: '${licenseKey}'
  }
});

const activeTab = ref('monitoring');
</script>`;
  } else if (frameworkMeta.name === 'Laravel') {
    adminFilename = 'FutureCloudAdmin.blade.php';
    adminTargetDir = path.join(process.cwd(), 'resources/views');
    
    // Pastikan direktori ada
    if (!fs.existsSync(adminTargetDir)) {
      fs.mkdirSync(adminTargetDir, { recursive: true });
    }

    adminContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FutureCloud Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" x-data="{ activeTab: 'monitoring' }">
        <div class="px-4 py-6 sm:px-0">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Panel Admin Customer Support</h1>
            
            <div class="mb-4 border-b border-gray-200">
                <ul class="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li class="mr-2">
                        <button @click="activeTab = 'monitoring'" :class="activeTab === 'monitoring' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Setup Monitoring</button>
                    </li>
                    <li class="mr-2">
                        <button @click="activeTab = 'livechat'" :class="activeTab === 'livechat' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Live Chat CS</button>
                    </li>
                </ul>
            </div>
            
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div x-show="activeTab === 'monitoring'">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/monitoring?license={{ $licenseKey ?? '${licenseKey}' }}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
                <div x-show="activeTab === 'livechat'" style="display: none;">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/livechat?license={{ $licenseKey ?? '${licenseKey}' }}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  } else {
    adminFilename = 'futurecloud-admin.html';
    if (fs.existsSync(path.join(process.cwd(), 'public'))) {
        adminTargetDir = path.join(process.cwd(), 'public');
    } else {
        adminTargetDir = process.cwd();
    }
    adminContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FutureCloud Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" x-data="{ activeTab: 'monitoring' }">
        <div class="px-4 py-6 sm:px-0">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Panel Admin Customer Support</h1>
            
            <div class="mb-4 border-b border-gray-200">
                <ul class="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li class="mr-2">
                        <button @click="activeTab = 'monitoring'" :class="activeTab === 'monitoring' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Setup Monitoring</button>
                    </li>
                    <li class="mr-2">
                        <button @click="activeTab = 'livechat'" :class="activeTab === 'livechat' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Live Chat CS</button>
                    </li>
                </ul>
            </div>
            
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div x-show="activeTab === 'monitoring'">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/monitoring?license=\${licenseKey}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
                <div x-show="activeTab === 'livechat'" style="display: none;">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/livechat?license=\${licenseKey}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  const adminPath = path.join(adminTargetDir, adminFilename);
  fs.writeFileSync(adminPath, adminContent, 'utf8');
  console.log(chalk.green(`\n[SUCCESS] Komponen Panel Admin berhasil dibuat:`));
  console.log(chalk.white(`   ${adminPath}`));

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

  const adminHtmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FutureCloud Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" x-data="{ activeTab: 'monitoring' }">
        <div class="px-4 py-6 sm:px-0">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Panel Admin Customer Support</h1>
            
            <div class="mb-4 border-b border-gray-200">
                <ul class="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li class="mr-2">
                        <button @click="activeTab = 'monitoring'" :class="activeTab === 'monitoring' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Setup Monitoring</button>
                    </li>
                    <li class="mr-2">
                        <button @click="activeTab = 'livechat'" :class="activeTab === 'livechat' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'" class="inline-block p-4 border-b-2 rounded-t-lg">Live Chat CS</button>
                    </li>
                </ul>
            </div>
            
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <div x-show="activeTab === 'monitoring'">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/monitoring?license=\${licenseKey}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
                <div x-show="activeTab === 'livechat'" style="display: none;">
                    <iframe src="https://api-monitoring.futurecloud.id/embed/livechat?license=\${licenseKey}" width="100%" height="800px" style="border:none;"></iframe>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  let adminTargetDir = process.cwd();
  if (fs.existsSync(path.join(process.cwd(), 'public'))) {
      adminTargetDir = path.join(process.cwd(), 'public');
  }
  const adminPath = path.join(adminTargetDir, 'futurecloud-admin.html');
  fs.writeFileSync(adminPath, adminHtmlContent, 'utf8');
  console.log(chalk.green(`\n[SUCCESS] File Halaman Admin Dashboard berhasil dibuat:`));
  console.log(chalk.white(`   ${adminPath}`));

  return { deployed: true, targetPath };
}

module.exports = { deployFile };

/**
 * lib/licenseVerifier.js
 * ─────────────────────────────────────────────────────────────────
 * Modul untuk meminta License Key dari user secara interaktif
 * (jika tidak diberikan via flag --key) dan melakukan verifikasi
 * ke backend API FutureCloud.
 * ─────────────────────────────────────────────────────────────────
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const axios = require('axios');

/**
 * ┌─ KUSTOMISASI ────────────────────────────────────────────────┐
 * │ Ganti BASE_URL di bawah dengan URL production API Anda.      │
 * │ Endpoint yang digunakan: POST /api/v1/license/verify         │
 * │                                                              │
 * │ Jika endpoint /license/verify belum tersedia di backend,     │
 * │ gunakan fallback: POST /api/v1/chat/send dengan header key.  │
 * │ Lihat fungsi verifyViaChat() di bawah sebagai referensi.     │
 * └──────────────────────────────────────────────────────────────┘
 */
const BASE_URL = 'https://api-monitoring.futurecloud.id/api/v1';

/**
 * Meminta License Key secara interaktif jika belum disediakan.
 * @param {string|null} keyFromFlag - Key dari flag --key (bisa null)
 * @returns {Promise<string>} - License key yang valid
 */
async function promptLicenseKey(keyFromFlag) {
  if (keyFromFlag) {
    // Key sudah diberikan via flag, langsung pakai
    console.log(chalk.gray(`[AUTH] License key diterima via flag --key`));
    return keyFromFlag;
  }

  console.log(chalk.cyan('\n[AUTH] Langkah 1: License Key\n'));

  const { licenseKey } = await inquirer.prompt([
    {
      type: 'password', // disembunyikan agar tidak terlihat di terminal
      name: 'licenseKey',
      message: 'Masukkan FutureCloud License Key Anda:',
      mask: '●',
      validate: (input) => {
        if (!input || input.trim().length < 8) {
          return 'License key tidak boleh kosong dan minimal 8 karakter.';
        }
        return true;
      },
    },
  ]);

  return licenseKey.trim();
}

/**
 * Verifikasi License Key ke endpoint backend FutureCloud.
 * 
 * ┌─ CATATAN BACKEND ────────────────────────────────────────────┐
 * │ Endpoint ini perlu dibuat di monitoring-plugin-api:             │
 * │                                                              │
 * │   Route::post('/v1/license/verify', [                        │
 * │       LicenseController::class, 'verify'                     │
 * │   ]);                                                        │
 * │                                                              │
 * │ Respons yang diharapkan:                                      │
 * │   Sukses → { "valid": true, "client_name": "..." }           │
 * │   Gagal  → { "valid": false, "message": "..." }              │
 * └──────────────────────────────────────────────────────────────┘
 * 
 * @param {string} licenseKey
 * @returns {Promise<{valid: boolean, clientName: string|null}>}
 */
async function verifyLicenseKey(licenseKey) {
  console.log(chalk.yellow('[WAIT] Memverifikasi license key ke server...'));

  try {
    // ── OPSI A: Endpoint /license/verify khusus (direkomendasikan) ──
    const response = await axios.post(
      `${BASE_URL}/license/verify`,
      {},
      {
        headers: {
          'X-FutureCloud-License': licenseKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000, // 10 detik timeout
      }
    );

    if (response.data && response.data.valid === true) {
      return { valid: true, clientName: response.data.client_name || null };
    }

    return { valid: false, message: response.data?.message || 'License key tidak valid.' };

  } catch (error) {
    // Tangani error HTTP spesifik
    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        return { valid: false, message: 'License key tidak valid atau tidak aktif.' };
      }

      if (status === 404) {
        // ── FALLBACK: Endpoint /verify belum ada, skip verifikasi ──
        // Hapus blok ini setelah endpoint /license/verify dibuat di backend.
        console.log(
          chalk.yellow(
            '\n[WARNING]  Endpoint /license/verify belum tersedia di backend.'
          ) +
          chalk.gray('\n   Verifikasi dilewati. Lanjut proses instalasi...\n')
        );
        return { valid: true, clientName: null, skipped: true };
      }
    }

    // Error jaringan (server mati, timeout, dll.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log(
        chalk.yellow('\n[WARNING]  Tidak dapat terhubung ke server API FutureCloud.') +
        chalk.gray('\n   Pastikan backend berjalan atau periksa koneksi internet Anda.')
      );

      // Tanya user apakah ingin lanjut offline
      const { continueOffline } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueOffline',
          message: 'Lanjutkan instalasi tanpa verifikasi online? (key akan tetap diinjeksi)',
          default: false,
        },
      ]);

      if (continueOffline) {
        return { valid: true, clientName: null, skipped: true };
      }

      return { valid: false, message: 'Instalasi dibatalkan (tidak ada koneksi ke server).' };
    }

    throw error; // re-throw error tidak terduga
  }
}

module.exports = { promptLicenseKey, verifyLicenseKey };

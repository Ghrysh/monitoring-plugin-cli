<template>
  <!-- Monitoring Plugin bersifat invisible, jadi tidak ada UI yang dirender -->
</template>

<script>
/**
 * FutureCloud Visitor Monitoring (Vue Wrapper)
 * Daftarkan dan render komponen ini di App.vue Anda.
 */
export default {
  name: 'MonitoringWidget',
  mounted() {
    if (document.getElementById('futurecloud-monitoring-script')) return;

    const script = document.createElement('script');
    script.id = 'futurecloud-monitoring-script';
    script.src = '/futurecloud/tracker.js'; // Pastikan file tracker.js disalin ke public/futurecloud/
    script.async = true;
    document.body.appendChild(script);
  },
  unmounted() {
    const existing = document.getElementById('futurecloud-monitoring-script');
    if (existing) {
      existing.remove();
    }
  }
}
</script>

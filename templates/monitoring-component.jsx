import React, { useEffect } from 'react';

/**
 * FutureCloud Visitor Monitoring (React Wrapper)
 * Komponen ini berfungsi memanggil skrip tracker di latar belakang.
 * Render <MonitoringPlugin /> ini di layout utama aplikasi Anda (misal: App.jsx).
 */
const MonitoringPlugin = () => {
    useEffect(() => {
        // Mencegah script di-load dua kali
        if (document.getElementById('futurecloud-monitoring-script')) return;

        const script = document.createElement('script');
        script.id = 'futurecloud-monitoring-script';
        script.src = '/futurecloud/tracker.js'; // Pastikan file disalin ke public/futurecloud/
        script.async = true;
        document.body.appendChild(script);

        return () => {
            const existing = document.getElementById('futurecloud-monitoring-script');
            if (existing) {
                existing.remove();
            }
        };
    }, []);

    // Monitoring ini tidak memiliki UI yang terlihat (invisible tracking)
    return null;
};

export default MonitoringPlugin;

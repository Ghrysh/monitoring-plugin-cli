/**
 * FutureCloud Visitor Monitoring Tracker
 * Skrip ini dipanggil untuk melacak perjalanan pengunjung secara otomatis.
 */

(function() {
    function generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    let sessionId = sessionStorage.getItem('fc_monitoring_session');
    if (!sessionId) {
        sessionId = generateSessionId();
        sessionStorage.setItem('fc_monitoring_session', sessionId);
    }

    const licenseKey = window.FUTURECLOUD_CONFIG?.LICENSE_KEY || '%%LICENSE_KEY%%';
    const apiUrl = window.FUTURECLOUD_CONFIG?.API_URL || '%%API_URL%%';

    function getBrowser() {
        const ua = navigator.userAgent;
        if (ua.indexOf("Firefox") > -1) return "Firefox";
        if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
        if (ua.indexOf("Trident") > -1) return "Internet Explorer";
        if (ua.indexOf("Edge") > -1) return "Edge";
        if (ua.indexOf("Chrome") > -1) return "Chrome";
        if (ua.indexOf("Safari") > -1) return "Safari";
        return "Unknown";
    }

    function getOS() {
        const ua = navigator.userAgent;
        if (ua.indexOf("Win") !== -1) return "Windows";
        if (ua.indexOf("Mac") !== -1) return "MacOS";
        if (ua.indexOf("Linux") !== -1) return "Linux";
        if (ua.indexOf("Android") !== -1) return "Android";
        if (ua.indexOf("like Mac") !== -1) return "iOS";
        return "Unknown";
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return "Desktop";
    }

    async function trackVisit(path) {
        try {
            // Optional: Fetch location if needed, but usually server handles IP
            let country = null;
            let city = null;
            try {
                const geo = await fetch('https://ip-api.com/json/?fields=country,city').then(res => res.json());
                country = geo.country;
                city = geo.city;
            } catch (e) {
                // Ignore geo error
            }

            await fetch(`${apiUrl}/visitor/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-FutureCloud-License': licenseKey
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    page_url: path,
                    device: getDeviceType(),
                    browser: getBrowser(),
                    os: getOS(),
                    country: country,
                    city: city
                })
            });
        } catch (error) {
            console.error('FutureCloud Tracker Error:', error);
        }
    }

    // Lacak halaman awal saat load
    trackVisit(window.location.pathname);

    // Deteksi navigasi SPA (History API)
    let lastUrl = location.href; 
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            trackVisit(window.location.pathname);
        }
    }).observe(document, {subtree: true, childList: true});

    // Deteksi History pushState/replaceState
    const pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(history, arguments);
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            trackVisit(window.location.pathname);
        }
    };
})();

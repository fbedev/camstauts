document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const primaryNav = document.getElementById('primaryNav');
    const yearTarget = document.getElementById('currentYear');

    const closeNav = () => {
        if (primaryNav) {
            primaryNav.classList.remove('open');
        }
        if (menuToggle) {
            menuToggle.setAttribute('aria-expanded', 'false');
        }
        document.body.classList.remove('nav-open');
    };

    if (menuToggle && primaryNav) {
        menuToggle.addEventListener('click', () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            const nextState = !expanded;
            menuToggle.setAttribute('aria-expanded', String(nextState));
            primaryNav.classList.toggle('open', nextState);
            document.body.classList.toggle('nav-open', nextState);
        });

        primaryNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeNav();
            });
        });
    }

    if (yearTarget) {
        yearTarget.textContent = String(new Date().getFullYear());
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', event => {
                const href = anchor.getAttribute('href');
                if (!href || href === '#' || href.length === 1) {
                    return;
                }

                const target = document.getElementById(href.slice(1));
                if (target) {
                    event.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // --- Live global status polling ---
    const devicesEl = document.getElementById('devicesReporting');
    const totalRecordingEl = document.getElementById('totalRecordingGlobal');
    const totalTakesEl = document.getElementById('totalTakes');
    const updatedEl = document.getElementById('statusUpdated');

    function formatDuration(seconds) {
        seconds = Math.max(0, Math.floor(seconds || 0));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
        return `${minutes}m ${String(secs).padStart(2, '0')}s`;
    }

    async function checkImage(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    async function populateGallery() {
        // load app icon
        const appIcon = document.getElementById('appIcon');
        if (appIcon) {
            const exists = await checkImage(appIcon.getAttribute('src'));
            if (!exists) appIcon.style.display = 'none';
        }

        // screenshots with data-src attribute
        const gallery = document.getElementById('screenshotsGallery');
        if (!gallery) return;
        const imgs = Array.from(gallery.querySelectorAll('img'));
        for (const el of imgs) {
            const src = el.getAttribute('data-src');
            if (!src) continue;
            const ok = await checkImage(src);
            if (ok) {
                el.setAttribute('src', src);
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        }
    }

    async function fetchGlobalStatus() {
        try {
            const t = Date.now();
            const res = await fetch(`/api/statistics?t=${t}`);
            if (!res.ok) throw new Error('no data');
            const stats = await res.json();

            const latest = Array.isArray(stats) && stats.length ? stats[0] : (stats || {});

            // heuristics for fields - keep safe fallbacks
            const devices = latest.total_devices ?? latest.devices_reporting ?? latest.devices_count ?? (Array.isArray(stats) ? stats.length : null);
            const recordingSeconds = latest.total_recording_time ?? latest.recording_time ?? latest.daily_recording_time ?? 0;
            const takes = latest.total_photos ?? latest.total_takes ?? latest.total_sessions ?? latest.takes ?? 0;

            if (devicesEl) devicesEl.textContent = devices == null ? '—' : String(devices);
            if (totalRecordingEl) totalRecordingEl.textContent = formatDuration(recordingSeconds);
            if (totalTakesEl) totalTakesEl.textContent = String(takes || 0);
            if (updatedEl) updatedEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // populate per-device list
            renderDeviceList(stats);
        } catch (err) {
            // keep existing values if fetch fails
            console.debug('Failed to fetch global status', err);
        }
    }

    function renderDeviceList(stats) {
        const container = document.getElementById('deviceList');
        if (!container) return;

        // stats might be an array of entries per device over time.
        // Build a map of latest entry per device (use device_id or device_name)
        const map = new Map();
        if (Array.isArray(stats)) {
            for (const entry of stats) {
                const key = entry.device_id ?? entry.device_name ?? `${entry.device_model || 'device'}-${entry.device_name || ''}`;
                const prev = map.get(key);
                const ts = entry.last_updated ? new Date(entry.last_updated).getTime() : Date.now();
                if (!prev || ts > prev._ts) {
                    map.set(key, Object.assign({ _ts: ts }, entry));
                }
            }
        }

        if (map.size === 0) {
            container.innerHTML = '<div class="device-empty">No devices reporting yet.</div>';
            return;
        }

        const rows = [];
        for (const [key, device] of map.entries()) {
            const name = device.device_name || key || 'Unknown Device';
            const model = device.device_model || 'Unknown Model';
            const last = device.last_updated ? new Date(device.last_updated) : new Date(device._ts);
            const lastText = last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const battery = device.battery ?? device.battery_level ?? null;

            const batteryHtml = battery == null ? '' : `<span class="badge-small">${battery}%</span>`;

            rows.push(`
                <div class="device-row">
                    <div class="device-meta">
                        <div>
                            <div class="device-name">${escapeHtml(name)}</div>
                            <div class="device-model">${escapeHtml(model)}</div>
                        </div>
                    </div>
                    <div class="device-stats">
                        ${batteryHtml}
                        <div class="device-last">Last: ${escapeHtml(lastText)}</div>
                    </div>
                </div>
            `);
        }

        container.innerHTML = rows.join('');
    }

    // tiny helper to prevent injection when inserting strings
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // initial population
    populateGallery();
    fetchGlobalStatus();
    // refresh every 15s
    setInterval(fetchGlobalStatus, 15000);
});
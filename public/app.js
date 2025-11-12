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

    // --- Live global status polling (focused status page) ---
    const devicesEl = document.getElementById('devicesReporting');
    const totalRecordingEl = document.getElementById('totalRecordingGlobal');
    const totalTakesEl = document.getElementById('totalTakes');
    const updatedEl = document.getElementById('statusUpdated');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

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

            // Expect aggregate object as first element, followed by per-device rows
            const aggregate = Array.isArray(stats) && stats.length && stats[0].device_id === 'aggregate' ? stats[0] : null;
            const perDevice = Array.isArray(stats) ? (aggregate ? stats.slice(1) : stats) : [];

            const devices = aggregate ? aggregate.total_devices : perDevice.length;
            const recordingSeconds = aggregate ? aggregate.total_recording_time : (perDevice.reduce((s, r) => s + Number(r.total_recording_time || 0), 0));
            const takes = aggregate ? aggregate.total_photos : (perDevice.reduce((s, r) => s + Number(r.total_photos || 0), 0));

            if (devicesEl) devicesEl.textContent = devices == null ? '—' : String(devices);
            if (totalRecordingEl) totalRecordingEl.textContent = formatDuration(recordingSeconds);
            if (totalTakesEl) totalTakesEl.textContent = String(takes || 0);
            if (updatedEl) updatedEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // populate per-device list with filtering/sorting
            renderDeviceList(perDevice);
        } catch (err) {
            // keep existing values if fetch fails
            console.debug('Failed to fetch global status', err);
        }
    }

    function renderDeviceList(stats) {
        const container = document.getElementById('deviceList');
        if (!container) return;
        // stats is expected to be an array of latest rows per device
        const list = Array.isArray(stats) ? stats.slice() : [];

        // apply search filter
        const q = searchInput && searchInput.value ? searchInput.value.trim().toLowerCase() : '';
        const filtered = list.filter(d => {
            if (!q) return true;
            const combined = `${d.device_id || ''} ${d.device_name || ''} ${d.device_model || ''}`.toLowerCase();
            return combined.includes(q);
        });

        // apply sorting
        const sort = sortSelect ? sortSelect.value : 'updated';
        filtered.sort((a, b) => {
            if (sort === 'recording') return (b.total_recording_time || 0) - (a.total_recording_time || 0);
            if (sort === 'photos') return (b.total_photos || 0) - (a.total_photos || 0);
            if (sort === 'name') return String((a.device_name||a.device_id||'')).localeCompare(String(b.device_name||b.device_id||''));
            // default: updated
            return new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime();
        });

        if (filtered.length === 0) {
            container.innerHTML = '<tr><td colspan="8" class="muted">No devices match the filter.</td></tr>';
            return;
        }

        const rowsHtml = filtered.map(device => {
            const name = escapeHtml(device.device_name || device.device_id || 'Unknown');
            const model = escapeHtml(device.device_model || '—');
            const recording = formatDuration(device.total_recording_time || device.recording_time || 0);
            const sessions = device.total_sessions ?? device.sessions ?? 0;
            const appUsage = formatDuration(device.app_usage_time || device.app_usage || 0);
            const photos = device.total_photos ?? device.photos ?? 0;
            const battery = device.battery ?? device.battery_level ?? '';
            const last = device.last_updated ? new Date(device.last_updated) : new Date();
            const lastText = last.toLocaleTimeString();

            return `<tr>
                <td>${name}</td>
                <td>${model}</td>
                <td>${recording}</td>
                <td>${escapeHtml(String(sessions))}</td>
                <td>${appUsage}</td>
                <td>${escapeHtml(String(photos))}</td>
                <td>${battery === '' ? '' : escapeHtml(String(battery) + '%')}</td>
                <td>${escapeHtml(lastText)}</td>
            </tr>`;
        }).join('');

        container.innerHTML = rowsHtml;
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
    // refresh every 10s
    const INTERVAL = 10000;
    setInterval(fetchGlobalStatus, INTERVAL);

    // wire up search and sort
    if (searchInput) {
        searchInput.addEventListener('input', () => fetchGlobalStatus());
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', () => fetchGlobalStatus());
    }
});
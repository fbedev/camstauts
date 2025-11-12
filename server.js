const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/statistics.db`
    : './statistics.db';

console.log(`Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Add new columns to existing table if they don't exist
    db.run(`ALTER TABLE statistics ADD COLUMN device_model TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Note: device_model column may already exist');
        }
    });

    db.run(`ALTER TABLE statistics ADD COLUMN device_name TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Note: device_name column may already exist');
        }
    });

    db.run(`ALTER TABLE statistics ADD COLUMN total_photos INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Note: total_photos column may already exist');
        }
    });

    db.run(`ALTER TABLE statistics ADD COLUMN total_devices INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Note: total_devices column may already exist');
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        total_recording_time REAL DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        daily_recording_time REAL DEFAULT 0,
        daily_sessions INTEGER DEFAULT 0,
        app_usage_time REAL DEFAULT 0,
        device_model TEXT DEFAULT '',
        device_name TEXT DEFAULT '',
        total_photos INTEGER DEFAULT 0,
        total_devices INTEGER DEFAULT 1,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        date DATE DEFAULT CURRENT_DATE
    )`);

    db.run(`ALTER TABLE daily_stats ADD COLUMN photos INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Note: photos column may already exist in daily_stats');
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        date DATE NOT NULL,
        recording_time REAL DEFAULT 0,
        sessions INTEGER DEFAULT 0,
        app_usage_time REAL DEFAULT 0,
        photos INTEGER DEFAULT 0,
        UNIQUE(device_id, date)
    )`);
}

// API Routes
app.post('/api/statistics', (req, res) => {
    const stats = req.body;
    const deviceId = stats.deviceId || stats.device_id || 'default-device';

    // Normalize incoming payload keys from different app versions
    const normalizeNumber = (value, fallback = 0) => {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? fallback : parsed;
    };

    const totalRecordingTime = normalizeNumber(stats.totalRecordingTime ?? stats.total_recording_time);
    const dailyRecordingTime = normalizeNumber(stats.dailyRecordingTime ?? stats.daily_recording_time);
    const totalSessions = normalizeNumber(stats.totalSessions ?? stats.total_sessions, 0);
    const dailySessions = normalizeNumber(stats.dailySessions ?? stats.daily_sessions, 0);
    const appUsageTime = normalizeNumber(stats.appUsageTime ?? stats.app_usage_time);
    const dailyAppUsage = normalizeNumber(stats.dailyAppUsage ?? stats.daily_app_usage);
    const totalPhotos = normalizeNumber(stats.totalPhotosTaken ?? stats.totalPhotos ?? stats.total_photos);
    const dailyPhotos = normalizeNumber(stats.dailyPhotosTaken ?? stats.dailyPhotos ?? stats.daily_photos);
    const totalDevices = normalizeNumber(stats.totalDevicesUsed ?? stats.total_devices, 1);
    const deviceModel = stats.deviceModel || stats.device_model || '';
    const deviceName = stats.deviceName || stats.device_name || '';

    console.log('Received statistics:', stats);

    // Insert or update total statistics
    db.run(`INSERT OR REPLACE INTO statistics
        (device_id, total_recording_time, total_sessions, daily_recording_time, daily_sessions, app_usage_time, device_model, device_name, total_photos, total_devices, last_updated, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), date('now'))`,
        [deviceId, totalRecordingTime, totalSessions,
         dailyRecordingTime, dailySessions, appUsageTime,
         deviceModel, deviceName, totalPhotos, totalDevices],
        function(err) {
            if (err) {
                console.error('Error saving statistics:', err);
                return res.status(500).json({ error: 'Failed to save statistics' });
            }

            // Also save daily stats
            db.run(`INSERT OR REPLACE INTO daily_stats
                (device_id, date, recording_time, sessions, app_usage_time, photos)
                VALUES (?, date('now'), ?, ?, ?, ?)`,
                [deviceId, dailyRecordingTime, dailySessions, dailyAppUsage, dailyPhotos],
                function(err) {
                    if (err) {
                        console.error('Error saving daily stats:', err);
                        return res.status(500).json({ error: 'Failed to save daily statistics' });
                    }
                    res.json({ success: true, message: 'Statistics saved successfully' });
                });
        });
});

app.get('/api/statistics', (req, res) => {
    // Return an aggregated summary first, followed by the latest row per device.
    // This makes it easy for the frontend to display global totals (total devices,
    // total recording time, total photos) while still providing a per-device list.

    // Step 1: fetch the latest entry for each device (by last_updated)
    const latestPerDeviceQuery = `
        SELECT * FROM statistics AS s
        WHERE s.last_updated = (
            SELECT MAX(last_updated) FROM statistics WHERE device_id = s.device_id
        )
    `;

    db.all(latestPerDeviceQuery, [], (err, rows) => {
        if (err) {
            console.error('Error fetching statistics:', err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }

        // Compute aggregates from the latest-per-device rows
        const totalDevices = rows.length;
        const totalRecordingTime = rows.reduce((acc, r) => acc + Number(r.total_recording_time || 0), 0);
        const totalPhotos = rows.reduce((acc, r) => acc + Number(r.total_photos || r.total_photos === 0 ? r.total_photos : 0), 0);
        const lastUpdatedTs = rows.reduce((acc, r) => {
            const t = r.last_updated ? new Date(r.last_updated).getTime() : 0;
            return Math.max(acc, t);
        }, 0);

        const aggregate = {
            device_id: 'aggregate',
            device_name: 'GLOBAL',
            device_model: 'aggregate',
            total_devices: totalDevices,
            total_recording_time: totalRecordingTime,
            total_photos: totalPhotos,
            last_updated: lastUpdatedTs ? new Date(lastUpdatedTs).toISOString() : new Date().toISOString()
        };

        // Sort per-device rows by last_updated desc for the UI
        rows.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());

        // Return aggregate as first element for backward-compatible frontend heuristics
        res.json([aggregate, ...rows]);
    });
});

app.get('/api/statistics/device/:deviceId', (req, res) => {
    const { deviceId } = req.params;

    db.get(`SELECT * FROM statistics WHERE device_id = ? ORDER BY last_updated DESC LIMIT 1`,
        [deviceId],
        (err, row) => {
            if (err) {
                console.error('Error fetching device statistics:', err);
                return res.status(500).json({ error: 'Failed to fetch device statistics' });
            }

            if (!row) {
                return res.status(404).json({ message: 'No statistics found for device' });
            }

            res.json(row);
        });
});

app.get('/api/daily-stats', (req, res) => {
    const days = req.query.days || 30;
    db.all(`SELECT date, SUM(recording_time) as total_recording_time,
                   SUM(sessions) as total_sessions, SUM(app_usage_time) as total_app_usage,
                   SUM(photos) as total_photos
            FROM daily_stats
            WHERE date >= date('now', '-${days} days')
            GROUP BY date
            ORDER BY date DESC`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching daily stats:', err);
            return res.status(500).json({ error: 'Failed to fetch daily statistics' });
        }
        res.json(rows);
    });
});

// Serve the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}`);
});
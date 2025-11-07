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
const db = new sqlite3.Database('./statistics.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        total_recording_time REAL DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        daily_recording_time REAL DEFAULT 0,
        daily_sessions INTEGER DEFAULT 0,
        app_usage_time REAL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        date DATE DEFAULT CURRENT_DATE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        date DATE NOT NULL,
        recording_time REAL DEFAULT 0,
        sessions INTEGER DEFAULT 0,
        app_usage_time REAL DEFAULT 0,
        UNIQUE(device_id, date)
    )`);
}

// API Routes
app.post('/api/statistics', (req, res) => {
    const stats = req.body;
    const deviceId = stats.deviceId || 'default-device';

    console.log('Received statistics:', stats);

    // Insert or update total statistics
    db.run(`INSERT OR REPLACE INTO statistics
        (device_id, total_recording_time, total_sessions, daily_recording_time, daily_sessions, app_usage_time, last_updated, date)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), date('now'))`,
        [deviceId, stats.totalRecordingTime || 0, stats.totalSessions || 0,
         stats.dailyRecordingTime || 0, stats.dailySessions || 0, stats.appUsageTime || 0],
        function(err) {
            if (err) {
                console.error('Error saving statistics:', err);
                return res.status(500).json({ error: 'Failed to save statistics' });
            }

            // Also save daily stats
            db.run(`INSERT OR REPLACE INTO daily_stats
                (device_id, date, recording_time, sessions, app_usage_time)
                VALUES (?, date('now'), ?, ?, ?)`,
                [deviceId, stats.dailyRecordingTime || 0, stats.dailySessions || 0, stats.appUsageTime || 0],
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
    db.all(`SELECT * FROM statistics ORDER BY last_updated DESC LIMIT 100`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching statistics:', err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        res.json(rows);
    });
});

app.get('/api/daily-stats', (req, res) => {
    const days = req.query.days || 30;
    db.all(`SELECT date, SUM(recording_time) as total_recording_time,
                   SUM(sessions) as total_sessions, SUM(app_usage_time) as total_app_usage
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
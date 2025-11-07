# Camera Statistics Server

A web server for collecting and displaying statistics from the Camera iOS app. Built with Node.js, Express, and SQLite.

**Repository:** https://github.com/fbedev/camstauts

## Features

- 📊 Real-time statistics dashboard
- 📱 REST API for receiving data from iOS app
- 💾 SQLite database for data persistence
- 📈 Daily activity charts
- 🚀 Ready for Railway deployment

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run locally:**
   ```bash
   npm start
   ```

3. **Open dashboard:**
   Visit `http://localhost:3000` in your browser

## API Endpoints

### POST /api/statistics
Receive statistics from the iOS app.

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "totalRecordingTime": 3600.5,
  "totalSessions": 25,
  "dailyRecordingTime": 180.5,
  "dailySessions": 3,
  "appUsageTime": 240.0
}
```

### GET /api/statistics
Get all stored statistics.

### GET /api/daily-stats?days=30
Get daily aggregated statistics for the last N days.

## Quick Railway Deployment

1. **Go to Railway:** Visit [railway.app](https://railway.app) and sign up/login

2. **Deploy from GitHub:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Search for and select `fbedev/camstauts`
   - Click "Deploy"

3. **Wait for Deployment:**
   - Railway will automatically build and deploy your app
   - You'll get a domain like: `https://camstauts-production.up.railway.app`

4. **Update iOS App:**
   - Copy your Railway domain
   - Update `StatisticsAPIClient.swift` in your iOS app:
   ```swift
   private let baseURL = "https://your-railway-domain.railway.app"
   ```

5. **Test:**
   - Visit your Railway domain to see the dashboard
   - Run your iOS app to start collecting statistics!

## Features

- 📊 Real-time statistics dashboard
- 📱 REST API for receiving data from iOS app
- 💾 SQLite database for data persistence
- 📈 Daily activity charts with Chart.js
- 🚀 Railway-ready deployment
- 🔄 Auto-refreshing dashboard

## iOS App Configuration

Update the server URL in your iOS app's `StatisticsAPIClient.swift`:

```swift
private let baseURL = "https://your-railway-app.railway.app"
```

## Project Structure

```
statistics-server/
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── public/           # Static web files
│   ├── index.html    # Dashboard HTML
│   ├── styles.css    # Dashboard styling
│   └── app.js        # Frontend JavaScript
└── README.md         # This file
```
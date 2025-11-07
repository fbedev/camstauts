# Camera Statistics Server

A web server for collecting and displaying statistics from the Camera iOS app. Built with Node.js, Express, and SQLite.

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

## Railway Deployment

1. **Create Railway Account:**
   - Sign up at [railway.app](https://railway.app)

2. **Deploy the App:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your repository containing this code
   - Railway will automatically detect it's a Node.js app and deploy it

3. **Get Your Domain:**
   - Once deployed, Railway will provide a domain like: `https://your-project-name.railway.app`

4. **Update iOS App:**
   - In `StatisticsAPIClient.swift`, change the `baseURL` to your Railway domain:
   ```swift
   private let baseURL = "https://your-project-name.railway.app"
   ```

5. **Test the Deployment:**
   - Visit your Railway domain in a browser to see the dashboard
   - The iOS app will now send statistics to your Railway-hosted server

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
// Dashboard JavaScript
class StatisticsDashboard {
    constructor() {
        this.chart = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadData(), 30000);
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.showStatus('Refreshing data...', 'info');
            this.loadData();
        });
    }

    async loadData() {
        try {
            const [statsResponse, dailyResponse] = await Promise.all([
                fetch('/api/statistics'),
                fetch('/api/daily-stats')
            ]);

            if (!statsResponse.ok || !dailyResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const stats = await statsResponse.json();
            const dailyStats = await dailyResponse.json();

            this.updateStats(stats);
            this.updateChart(dailyStats);
            this.updateActivityList(stats);
            this.updateLastSync();

            this.showStatus('Data updated successfully', 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            this.showStatus('Failed to load data. Please try again.', 'error');
        }
    }

    updateStats(stats) {
        if (stats.length === 0) return;

        // Get the most recent stats
        const latest = stats[0];

        // Update main stats
        this.updateStatElement('totalRecordingTime', this.formatDuration(latest.total_recording_time || 0));
        this.updateStatElement('totalSessions', (latest.total_sessions || 0).toLocaleString());
        this.updateStatElement('totalPhotos', (latest.total_photos || 0).toLocaleString());
        this.updateStatElement('totalDevices', (latest.total_devices || 1).toString());
        this.updateStatElement('dailyRecordingTime', this.formatDuration(latest.daily_recording_time || 0));
        this.updateStatElement('appUsageTime', this.formatDuration(latest.app_usage_time || 0));

        // Update device information
        this.updateStatElement('deviceName', latest.device_name || 'Unknown Device');
        this.updateStatElement('deviceModel', latest.device_model || 'Unknown Model');

        this.updateLastSync();
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updateChart(dailyStats) {
        const ctx = document.getElementById('dailyChart').getContext('2d');

        // Prepare data for chart
        const labels = dailyStats.map(stat => this.formatDateShort(stat.date)).reverse();
        const recordingData = dailyStats.map(stat => (stat.total_recording_time || 0) / 60).reverse(); // Convert to minutes
        const sessionsData = dailyStats.map(stat => stat.total_sessions || 0).reverse();
        const usageData = dailyStats.map(stat => (stat.total_app_usage || 0) / 60).reverse(); // Convert to minutes
        const photosData = dailyStats.map(stat => stat.total_photos || 0).reverse();

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Recording Time (minutes)',
                    data: recordingData,
                    borderColor: 'rgb(0, 122, 255)',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Sessions',
                    data: sessionsData,
                    borderColor: 'rgb(175, 82, 222)',
                    backgroundColor: 'rgba(175, 82, 222, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Photos',
                    data: photosData,
                    borderColor: 'rgb(52, 199, 89)',
                    backgroundColor: 'rgba(52, 199, 89, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        cornerRadius: 8,
                        displayColors: true,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Recording Time (minutes)',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Sessions & Photos',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    updateActivityList(stats) {
        const activityList = document.getElementById('activityList');
        if (stats.length === 0) {
            activityList.innerHTML = '<div class="loading-state"><i class="fas fa-chart-line"></i><p>No activity data available yet.</p></div>';
            return;
        }

        const recentStats = stats.slice(0, 10); // Show last 10 entries
        activityList.innerHTML = recentStats.map(stat => `
            <div class="activity-item">
                <div class="device-info">
                    <div class="device-name">${stat.device_name || 'Unknown Device'}</div>
                    <div class="timestamp">${this.formatDate(stat.last_updated)}</div>
                </div>
                <div class="activity-stats">
                    <div>Recording: ${this.formatDuration(stat.daily_recording_time || 0)}</div>
                    <div>Sessions: ${stat.daily_sessions || 0}</div>
                    <div>Photos: ${stat.total_photos || 0}</div>
                    <div>Usage: ${this.formatDuration(stat.app_usage_time || 0)}</div>
                </div>
            </div>
        `).join('');
    }

    updateLastSync() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('lastUpdated').textContent = `Updated ${timeString}`;
        document.getElementById('syncStatus').textContent = `Last synced: ${timeString}`;
    }

    showStatus(message, type) {
        // Remove existing status messages
        const existing = document.querySelector('.success, .error');
        if (existing) {
            existing.remove();
        }

        const statusDiv = document.createElement('div');
        statusDiv.className = type;
        statusDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>${message}`;

        const container = document.querySelector('.main-content');
        container.insertBefore(statusDiv, container.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new StatisticsDashboard();
});
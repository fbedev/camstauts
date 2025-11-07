const http = require('http');

// Test data to send to the server
const testData = {
    deviceId: "test-device-123",
    totalRecordingTime: 3661.5, // 1 hour, 1 minute, 1.5 seconds
    totalSessions: 42,
    dailyRecordingTime: 180.5, // 3 minutes
    dailySessions: 5,
    appUsageTime: 240.0 // 4 minutes
};

// Test POST request
const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/statistics',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing POST /api/statistics...');
const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`Response: ${chunk}`);
    });

    res.on('end', () => {
        console.log('POST test completed.\n');

        // Now test GET request
        console.log('Testing GET /api/statistics...');
        http.get('http://localhost:3000/api/statistics', (res) => {
            console.log(`Status: ${res.statusCode}`);

            res.setEncoding('utf8');
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('GET Response:', data);
                console.log('All tests completed!');
            });
        }).on('error', (e) => {
            console.error(`GET Error: ${e.message}`);
        });
    });
});

req.on('error', (e) => {
    console.error(`POST Error: ${e.message}`);
});

req.write(postData);
req.end();
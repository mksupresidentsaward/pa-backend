const http = require('http');

const API_PORT = 5000;
const API_HOST = 'localhost';

// Credentials from .env
const ADMIN_EMAIL = 'mksupresidentsaward@gmail.com';
const ADMIN_PASSWORD = 'mksu@2025';

let authToken = '';

function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verifyApi() {
    console.log('Verifying API Endpoints...');

    try {
        // 1. Check Status
        console.log('Checking /auth/admin-status...');
        const statusRes = await makeRequest('/auth/admin-status');
        console.log(`Status: ${statusRes.status}`);
        if (statusRes.status !== 200) throw new Error('Admin status check failed');

        // 2. Login
        console.log('Logging in...');
        const loginRes = await makeRequest('/auth/login', 'POST', {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        console.log(`Login Status: ${loginRes.status}`);
        if (loginRes.status !== 200) throw new Error('Login failed');
        authToken = loginRes.body.token;
        console.log('Logged in successfully.');

        // 3. Create Event
        console.log('Creating Test Event...');
        const newEvent = {
            title: 'API Test Event',
            category: 'other',
            start: new Date().toISOString(),
            end: new Date(Date.now() + 3600000).toISOString(), // +1 hour
            location: 'Test Location',
            description: 'Created by verification script',
            featured: false
        };
        const createRes = await makeRequest('/events', 'POST', newEvent, authToken);
        console.log(`Create Event Status: ${createRes.status}`);
        if (createRes.status !== 201) {
            console.error('Create Event Error:', createRes.body);
            throw new Error('Event creation failed');
        }
        const eventId = createRes.body._id;
        console.log(`Event Created: ${eventId}`);

        // 4. Verify Event Exists
        console.log('Verifying Event...');
        const getRes = await makeRequest('/events');
        const eventExists = getRes.body.some(e => e._id === eventId);
        if (!eventExists) throw new Error('Created event not found in list');
        console.log('Event verified in list.');

        // 5. Delete Event
        console.log('Deleting Test Event...');
        const deleteRes = await makeRequest(`/events/${eventId}`, 'DELETE', null, authToken);
        console.log(`Delete Status: ${deleteRes.status}`);
        if (deleteRes.status !== 200) throw new Error('Event deletion failed');

        console.log('Verification Complete. All checks passed.');

    } catch (err) {
        console.error('Verification Failed:', err.message);
        process.exit(1);
    }
}

verifyApi();

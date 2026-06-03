const axios = require('axios');

async function checkNotesError() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'gm_admin',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('--- Fetching /api/reports/notes ---');
        const res = await axios.get('http://localhost:5000/api/reports/notes', { headers });
        console.log('Success:', res.data);
    } catch (err) {
        console.error('Error Status:', err.response?.status);
        console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
    }
}

checkNotesError();

async function testDashboards() {
    try {
        console.log('--- Logging in ---');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'gm_admin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginRes.json();
        
        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginData.message || loginRes.statusText}`);
        }

        const token = loginData.token;
        console.log('Login successful, token received.');
        
        const headers = { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('\n--- Testing /api/reports/stats ---');
        try {
            const statsRes = await fetch('http://localhost:5000/api/reports/stats', { headers });
            const statsData = await statsRes.json();
            console.log('Status:', statsRes.status);
            console.log('Data:', JSON.stringify(statsData.data, null, 2).substring(0, 500) + '...');
        } catch (err) {
            console.error('Error /api/reports/stats:', err.message);
        }

        console.log('\n--- Testing /api/reports/executive ---');
        try {
            const execRes = await fetch('http://localhost:5000/api/reports/executive', { headers });
            const execData = await execRes.json();
            console.log('Status:', execRes.status);
            console.log('Data:', JSON.stringify(execData.data, null, 2).substring(0, 500) + '...');
        } catch (err) {
            console.error('Error /api/reports/executive:', err.message);
        }

    } catch (err) {
        console.error('Process failed:', err.message);
    }
}

testDashboards();

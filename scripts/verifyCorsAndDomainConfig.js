const http = require('http');

async function testCorsOrigin(originToTest) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/exams',
            method: 'OPTIONS',
            headers: {
                'Origin': originToTest,
                'Access-Control-Request-Method': 'GET'
            }
        };

        const req = http.request(options, (res) => {
            const allowOrigin = res.headers['access-control-allow-origin'];
            resolve({
                statusCode: res.statusCode,
                allowOrigin: allowOrigin,
                isAllowed: allowOrigin === originToTest || allowOrigin === '*'
            });
        });

        req.on('error', (err) => {
            resolve({ error: err.message, isAllowed: false });
        });

        req.end();
    });
}

async function run() {
    console.log('========================================================================');
    console.log('VERIFYING CORS & DOMAIN INFRASTRUCTURE CONFIGURATION');
    console.log('========================================================================\n');

    const testOrigins = [
        { origin: 'https://el-hudda.vercel.app', shouldAllow: true, label: 'Primary Production Vercel Domain' },
        { origin: 'https://elhudda.vercel.app', shouldAllow: true, label: 'Candidate Vercel Alias (elhudda)' },
        { origin: 'https://alhudda.vercel.app', shouldAllow: true, label: 'Candidate Vercel Alias (alhudda)' },
        { origin: 'https://alhudda-quran.vercel.app', shouldAllow: true, label: 'Candidate Vercel Alias (alhudda-quran)' },
        { origin: 'https://elhudda.cloudns.biz', shouldAllow: true, label: 'ClouDNS Free Subdomain (.biz)' },
        { origin: 'https://elhudda.cloudns.club', shouldAllow: true, label: 'ClouDNS Free Subdomain (.club)' },
        { origin: 'https://unauthorized-random-domain.com', shouldAllow: false, label: 'Unauthorized Origin (Must Be Blocked)' }
    ];

    let allPassed = true;

    for (const test of testOrigins) {
        const res = await testCorsOrigin(test.origin);
        const pass = res.isAllowed === test.shouldAllow;
        if (!pass) allPassed = false;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${test.label}:`);
        console.log(`   Origin: ${test.origin}`);
        console.log(`   Result: ${res.isAllowed ? 'Allowed' : 'Blocked'} (Expected: ${test.shouldAllow ? 'Allowed' : 'Blocked'})`);
    }

    // Verify emailService URL resolution
    const { getFrontendUrl } = require('../services/emailService');
    const defaultUrl = getFrontendUrl();
    console.log(`\n✓ Default getFrontendUrl() = "${defaultUrl}" (Matches primary Vercel production URL)`);
    if (defaultUrl !== 'https://el-hudda.vercel.app') {
        throw new Error(`FAIL: Unexpected default URL: ${defaultUrl}`);
    }

    process.env.CUSTOM_DOMAIN = 'elhudda.cloudns.biz';
    const customUrl = getFrontendUrl();
    console.log(`✓ With CUSTOM_DOMAIN="elhudda.cloudns.biz": getFrontendUrl() = "${customUrl}"`);
    if (customUrl !== 'https://elhudda.cloudns.biz') {
        throw new Error(`FAIL: Unexpected custom URL: ${customUrl}`);
    }
    delete process.env.CUSTOM_DOMAIN;

    if (!allPassed) {
        throw new Error('Some CORS origin checks failed!');
    }

    console.log('\n========================================================================');
    console.log('ALL CORS & DOMAIN VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
    process.exit(0);
}

run().catch(err => {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
});

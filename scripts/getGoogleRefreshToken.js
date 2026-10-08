/**
 * Local helper script to obtain GOOGLE_REFRESH_TOKEN for Gmail API.
 * 
 * Usage:
 *   node scripts/getGoogleRefreshToken.js
 * 
 * This script runs LOCALLY ONLY. It does not store tokens or modify Git.
 */

const http = require('http')
const url = require('url')
const readline = require('readline')
const { google } = require('googleapis')
require('dotenv').config()

const REDIRECT_PORT = 3000
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`
const SCOPES = ['https://www.googleapis.com/auth/gmail.send']

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve))

async function run() {
    console.log('\n======================================================')
    console.log('  El-Hudda - Google OAuth2 Refresh Token Generator   ')
    console.log('======================================================\n')

    let clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()

    if (!clientId) {
        clientId = (await askQuestion('1. Enter your GOOGLE_CLIENT_ID: ')).trim()
    } else {
        console.log(`✓ Using GOOGLE_CLIENT_ID from environment (.env)`)
    }

    if (!clientSecret) {
        clientSecret = (await askQuestion('2. Enter your GOOGLE_CLIENT_SECRET: ')).trim()
    } else {
        console.log(`✓ Using GOOGLE_CLIENT_SECRET from environment (.env)`)
    }

    if (!clientId || !clientSecret) {
        console.error('\n[ERROR] Both Client ID and Client Secret are required!')
        process.exit(1)
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES
    })

    console.log('\n------------------------------------------------------')
    console.log('Step 1: Open this URL in your web browser:\n')
    console.log(authUrl)
    console.log('\n------------------------------------------------------')
    console.log('Step 2: Sign in with the Gmail account you want to send emails from.')
    console.log('Step 3: Click "Continue" / "Allow" to grant Gmail sending permission.')
    console.log(`Waiting for automatic redirect on http://localhost:${REDIRECT_PORT}/oauth2callback ...\n`)
    console.log('(Alternative: You can also paste the authorization code manually below)')

    let serverClosed = false

    const handleExchange = async (code) => {
        try {
            console.log('\nExchanging authorization code for tokens...')
            const { tokens } = await oauth2Client.getToken(code)

            if (!tokens.refresh_token) {
                console.warn('\n[WARNING] No refresh_token was returned by Google.')
                console.warn('This usually happens if consent was already granted without prompt=consent.')
                console.warn('Please revoke app access at: https://myaccount.google.com/permissions and run this script again.\n')
            } else {
                console.log('\n======================================================')
                console.log('  SUCCESS! REFRESH TOKEN GENERATED SUCCESSFULLY       ')
                console.log('======================================================\n')
                console.log(`GOOGLE_REFRESH_TOKEN:\n`)
                console.log(tokens.refresh_token)
                console.log('\n------------------------------------------------------')
                console.log('Now add the following Environment Variables to Render:')
                console.log('  GOOGLE_CLIENT_ID=' + clientId)
                console.log('  GOOGLE_CLIENT_SECRET=' + clientSecret)
                console.log('  GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token)
                console.log('  GOOGLE_SENDER_EMAIL=<your-gmail-address>')
                console.log('======================================================\n')
            }
        } catch (err) {
            console.error('\n[ERROR] Failed to exchange code for tokens:', err.message || err)
        } finally {
            rl.close()
            if (server && !serverClosed) {
                serverClosed = true
                server.close()
            }
            process.exit(0)
        }
    }

    // Start local server to capture redirect automatically
    const server = http.createServer(async (req, res) => {
        try {
            const reqUrl = url.parse(req.url, true)
            if (reqUrl.pathname === '/oauth2callback') {
                const code = reqUrl.query.code

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(`
                        <html dir="rtl" style="font-family: sans-serif; text-align: center; padding: 40px; background: #f0fdf4;">
                            <h1 style="color: #059669;">✓ تم ربط الحساب بنجاح!</h1>
                            <p style="color: #374151;">تم استلام رمز التفويض من Google بنجاح. يمكنك إغلاق هذه الصفحة والعودة إلى شاشة الـ Terminal لنسخ الـ Refresh Token.</p>
                        </html>
                    `)
                    await handleExchange(code)
                } else if (reqUrl.query.error) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(`<h1 style="color: #dc2626;">Error: ${reqUrl.query.error}</h1>`)
                    console.error('\n[ERROR] Authorization error received:', reqUrl.query.error)
                }
            }
        } catch (e) {
            console.error('Server error:', e)
        }
    })

    server.listen(REDIRECT_PORT, () => {
        // Server listening
    })

    // Fallback: manual code entry
    rl.question('Paste authorization code here (if redirect does not work): ', async (manualCode) => {
        if (manualCode && manualCode.trim()) {
            await handleExchange(manualCode.trim())
        }
    })
}

run().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})

const { google } = require('googleapis')
require('dotenv').config()

let gmailClientInstance = null

/**
 * Lazy initializer for Gmail API client via OAuth 2.0
 */
const getGmailClient = () => {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim()

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are missing in environment variables')
    }

    if (!gmailClientInstance) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        })

        gmailClientInstance = google.gmail({
            version: 'v1',
            auth: oauth2Client
        })
    }

    return gmailClientInstance
}

/**
 * Sender identity for emails sent through Gmail API
 */
const getSenderEmail = () => {
    const email = (process.env.GOOGLE_SENDER_EMAIL || '').trim()
    if (!email) {
        throw new Error('GOOGLE_SENDER_EMAIL is not defined in environment variables')
    }

    if (email.includes('<') && email.includes('>')) {
        return email
    }

    return `مدرسة الهدى للقرآن الكريم <${email}>`
}

/**
 * Resolves the production frontend URL safely, preventing localhost or Render backend in production
 */
const getFrontendUrl = () => {
    const raw = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
        .trim()
        .replace(/\/+$/, '')

    if (
        raw &&
        !raw.includes('localhost') &&
        !raw.includes('127.0.0.1') &&
        !raw.includes('onrender.com')
    ) {
        return raw
    }

    return 'https://el-hudda.vercel.app'
}

/**
 * Creates an RFC 2822 compliant email message and encodes it to base64url for Gmail API
 * Supports UTF-8 Arabic text in headers and HTML body
 */
const createRawEmail = ({ from, to, subject, html }) => {
    const cleanFrom = (from || '').trim()
    let formattedFrom = cleanFrom
    const match = cleanFrom.match(/^(.*?)\s*<(.+?)>$/)
    if (match) {
        const displayName = match[1].replace(/^["']|["']$/g, '').trim()
        const emailAddress = match[2].trim()
        if (displayName) {
            formattedFrom = `=?UTF-8?B?${Buffer.from(displayName, 'utf-8').toString('base64')}?= <${emailAddress}>`
        }
    }

    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`

    const utf8HtmlBase64 = Buffer.from(html, 'utf-8')
        .toString('base64')
        .replace(/(.{76})/g, '$1\r\n')

    const messageParts = [
        `From: ${formattedFrom}`,
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        utf8HtmlBase64
    ]

    const rawMessage = messageParts.join('\r\n')

    return Buffer.from(rawMessage, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

/**
 * Sends an email via Gmail API HTTP request using OAuth 2.0
 */
const sendMailViaGmail = async ({ to, subject, html }) => {
    const gmail = getGmailClient()
    const from = getSenderEmail()
    const raw = createRawEmail({ from, to, subject, html })

    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw
        }
    })

    return response.data
}

/**
 * Send Arabic verification email with 15-minute token via Gmail API
 */
const sendVerificationEmail = async (email, token, userName = '') => {
    const frontendUrl = getFrontendUrl()
    const encodedEmail = encodeURIComponent(email)
    const encodedToken = encodeURIComponent(token)
    const verificationLink = `${frontendUrl}/pages/auth/verify-email.html?token=${encodedToken}&email=${encodedEmail}`

    const greetingText = userName && userName.trim()
        ? `السلام عليكم ورحمة الله وبركاته، أهلاً بك يا <strong>${userName.trim()}</strong>،`
        : 'السلام عليكم ورحمة الله وبركاته،'

    const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    direction: rtl;
                    text-align: right;
                    color: #1e293b;
                }
                .container {
                    max-width: 580px;
                    margin: 30px auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                }
                .header {
                    background: #047857;
                    padding: 32px 24px;
                    text-align: center;
                    color: #ffffff;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 800;
                }
                .header p {
                    margin: 8px 0 0;
                    font-size: 13px;
                    color: #a7f3d0;
                }
                .body {
                    padding: 32px 28px;
                    line-height: 1.8;
                }
                .greeting {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 16px;
                }
                .text {
                    font-size: 14px;
                    color: #475569;
                    margin-bottom: 24px;
                }
                .btn-container {
                    text-align: center;
                    margin: 30px 0;
                }
                .btn {
                    display: inline-block;
                    background-color: #059669;
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 14px 36px;
                    font-size: 15px;
                    font-weight: 700;
                    border-radius: 12px;
                    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
                }
                .notice {
                    background-color: #f0fdf4;
                    border-right: 4px solid #059669;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #166534;
                    margin-bottom: 24px;
                }
                .fallback {
                    font-size: 12px;
                    color: #64748b;
                    word-break: break-all;
                    margin-top: 20px;
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 16px;
                }
                .footer {
                    background-color: #f1f5f9;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>مدرسة الهدى للقرآن الكريم (El-Hudda)</h1>
                    <p>المسجد العامر — نظام إدارة المدرسة القرآنية</p>
                </div>
                <div class="body">
                    <div class="greeting">${greetingText}</div>
                    <p class="text">
                        أهلاً ومرحباً بك في مدرسة الهدى للقرآن الكريم. لقد تم إنشاء حساب جديد مرتبط بهذا البريد الإلكتروني. لتأكيد حسابك وتفعيله، يرجى الضغط على الزر أدناه:
                    </p>
                    <div class="btn-container">
                        <a href="${verificationLink}" class="btn" target="_blank">تأكيد البريد الإلكتروني</a>
                    </div>
                    <div class="notice">
                        ⏱️ <strong>ملاحظة:</strong> صلاحية هذا الرابط هي <strong>15 دقيقة</strong> فقط من وقت استلام هذه الرسالة.
                    </div>
                    <p class="text" style="font-size: 13px; color: #64748b;">
                        إذا لم تكن أنت من أنشأ هذا الحساب أو طلبت هذا الإجراء، يمكنك تجاهل هذه الرسالة بأمان دون اتخاذ أي خطوة.
                    </p>
                    <div class="fallback">
                        إذا واجهت مشكلة في الضغط على الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:<br>
                        <a href="${verificationLink}" style="color: #059669;">${verificationLink}</a>
                    </div>
                </div>
                <div class="footer">
                    © 2026 مدرسة الهدى للقرآن الكريم (El-Hudda) — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
    `

    try {
        const result = await sendMailViaGmail({
            to: email,
            subject: 'تأكيد البريد الإلكتروني | مدرسة الهدى للقرآن الكريم',
            html
        })
        return result
    } catch (err) {
        console.error(`Failed to send verification email via Gmail API: ${err.message || 'Unknown error'}`)
        const error = new Error('Failed to send verification email')
        error.code = 'EMAIL_SEND_FAILED'
        error.statusCode = 500
        throw error
    }
}

/**
 * Send Arabic password reset email with 15-minute token via Gmail API
 */
const sendResetPasswordEmail = async (email, token) => {
    const frontendUrl = getFrontendUrl()
    const encodedToken = encodeURIComponent(token)
    const resetLink = `${frontendUrl}/pages/auth/reset-password.html?token=${encodedToken}`

    const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    direction: rtl;
                    text-align: right;
                    color: #1e293b;
                }
                .container {
                    max-width: 580px;
                    margin: 30px auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                }
                .header {
                    background: #047857;
                    padding: 32px 24px;
                    text-align: center;
                    color: #ffffff;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 800;
                }
                .body {
                    padding: 32px 28px;
                    line-height: 1.8;
                }
                .greeting {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 16px;
                }
                .text {
                    font-size: 14px;
                    color: #475569;
                    margin-bottom: 24px;
                }
                .btn-container {
                    text-align: center;
                    margin: 30px 0;
                }
                .btn {
                    display: inline-block;
                    background-color: #059669;
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 14px 36px;
                    font-size: 15px;
                    font-weight: 700;
                    border-radius: 12px;
                    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
                }
                .notice {
                    background-color: #fef2f2;
                    border-right: 4px solid #ef4444;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #991b1b;
                    margin-bottom: 24px;
                }
                .fallback {
                    font-size: 12px;
                    color: #64748b;
                    word-break: break-all;
                    margin-top: 20px;
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 16px;
                }
                .footer {
                    background-color: #f1f5f9;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>مدرسة الهدى للقرآن الكريم (El-Hudda)</h1>
                </div>
                <div class="body">
                    <div class="greeting">السلام عليكم ورحمة الله وبركاته،</div>
                    <p class="text">
                        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في مدرسة الهدى. يمكنك تعيين كلمة مرور جديدة من خلال الضغط على الزر أدناه:
                    </p>
                    <div class="btn-container">
                        <a href="${resetLink}" class="btn" target="_blank">إعادة تعيين كلمة المرور</a>
                    </div>
                    <div class="notice">
                        ⏱️ <strong>تنبيه أمان:</strong> صلاحية هذا الرابط هي <strong>15 دقيقة</strong> فقط.
                    </div>
                    <p class="text" style="font-size: 13px; color: #64748b;">
                        إذا لم تكن قد طلبت إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة، فستبقى كلمة المرور الحالية آمنة كما هي.
                    </p>
                    <div class="fallback">
                        إذا واجهت مشكلة في الضغط على الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:<br>
                        <a href="${resetLink}" style="color: #059669;">${resetLink}</a>
                    </div>
                </div>
                <div class="footer">
                    © 2026 مدرسة الهدى للقرآن الكريم (El-Hudda) — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
    `

    try {
        const result = await sendMailViaGmail({
            to: email,
            subject: 'إعادة تعيين كلمة المرور | مدرسة الهدى للقرآن الكريم',
            html
        })
        return result
    } catch (err) {
        console.error(`Failed to send reset password email via Gmail API: ${err.message || 'Unknown error'}`)
        const error = new Error('Failed to send reset password email')
        error.code = 'EMAIL_SEND_FAILED'
        error.statusCode = 500
        throw error
    }
}

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    createRawEmail,
    getFrontendUrl,
    getSenderEmail,
    getGmailClient
}
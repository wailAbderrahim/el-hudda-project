require('dotenv').config()

/**
 * Escapes HTML characters in user input to prevent HTML injection in emails
 */
const escapeHtml = (value = '') => {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/**
 * Resolves the frontend URL from environment variables
 * Throws a configuration error if FRONTEND_URL is missing or empty
 */
const getFrontendUrl = () => {
    const raw = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim().replace(/\/+$/, '')
    if (raw && !raw.includes('localhost') && !raw.includes('127.0.0.1') && !raw.includes('onrender.com')) {
        return raw
    }
    return raw || 'https://el-hudda.vercel.app'
}


/**
 * Sends a transactional email via Brevo HTTP API
 * POST https://api.brevo.com/v3/smtp/email
 */
const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
    let brevoKey = (process.env.BREVO_API_KEY || '').trim()

    // Safely remove any surrounding quotes if accidentally included in environment configuration
    if ((brevoKey.startsWith('"') && brevoKey.endsWith('"')) || (brevoKey.startsWith("'") && brevoKey.endsWith("'"))) {
        brevoKey = brevoKey.slice(1, -1).trim()
    }

    console.log('[BREVO CONFIG] API key exists:', Boolean(brevoKey))
    console.log('[BREVO CONFIG] API key length:', brevoKey.length)

    const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim()
    const senderName = (process.env.BREVO_SENDER_NAME || 'الهدى للقرآن').trim()

    if (!brevoKey) {
        console.error('Brevo configuration error: BREVO_API_KEY is missing in environment variables')
        const err = new Error('إعدادات إرسال البريد غير مكتملة في الخادم')
        err.code = 'EMAIL_SEND_FAILED'
        err.statusCode = 500
        throw err
    }

    if (!senderEmail) {
        console.error('Brevo configuration error: BREVO_SENDER_EMAIL is missing in environment variables')
        const err = new Error('إعدادات إرسال البريد غير مكتملة في الخادم')
        err.code = 'EMAIL_SEND_FAILED'
        err.statusCode = 500
        throw err
    }

    const recipient = { email: toEmail.trim() }
    if (toName && toName.trim()) {
        recipient.name = toName.trim()
    }

    const payload = {
        sender: {
            name: senderName,
            email: senderEmail
        },
        to: [recipient],
        subject: subject,
        htmlContent: htmlContent
    }

    try {
        console.log('[BREVO DEBUG] Sending request to Brevo API')
        console.log('[BREVO DEBUG] Authorization key present:', Boolean(brevoKey))

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            const errorDetail = data.message || `Status ${response.status}`
            console.error(`Failed to send email via Brevo API: ${errorDetail}`)
            const err = new Error('فشل إرسال البريد الإلكتروني')
            err.code = 'EMAIL_SEND_FAILED'
            err.statusCode = 500
            throw err
        }

        return data
    } catch (err) {
        if (!err.code) {
            console.error(`Brevo API network/request failure: ${err.message || err}`)
            err.code = 'EMAIL_SEND_FAILED'
            err.statusCode = 500
            err.message = 'فشل إرسال البريد الإلكتروني'
        }
        throw err
    }
}

/**
 * Send Arabic verification email with 15-minute token via Brevo API
 * Supports both signatures:
 *   sendVerificationEmail(email, name, verificationUrl)
 *   sendVerificationEmail(email, token, name)
 */
const sendVerificationEmail = async (email, nameOrToken, urlOrName) => {
    let recipientName = ''
    let verificationUrl = ''

    if (typeof urlOrName === 'string' && (urlOrName.startsWith('http://') || urlOrName.startsWith('https://'))) {
        recipientName = nameOrToken || ''
        verificationUrl = urlOrName
    } else {
        const token = nameOrToken
        recipientName = urlOrName || ''
        const frontendUrl = getFrontendUrl()
        verificationUrl = `${frontendUrl}/pages/auth/verify-email.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    }

    const safeName = escapeHtml(recipientName.trim())
    const greeting = safeName
        ? `السلام عليكم ورحمة الله وبركاته، أهلاً بك يا <strong>${safeName}</strong>،`
        : 'السلام عليكم ورحمة الله وبركاته،'

    const htmlContent = `
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
                    <h1>مدرسة الهدى للقرآن الكريم</h1>
                    <p>المسجد العامر — نظام إدارة المدرسة القرآنية</p>
                </div>
                <div class="body">
                    <div class="greeting">${greeting}</div>
                    <p class="text">
                        أهلاً ومرحباً بك في مدرسة الهدى للقرآن الكريم. لقد تم إنشاء حساب جديد مرتبط بهذا البريد الإلكتروني. لتأكيد حسابك وتفعيله، يرجى الضغط على الزر أدناه:
                    </p>
                    <div class="btn-container">
                        <a href="${verificationUrl}" class="btn" target="_blank">تأكيد البريد الإلكتروني</a>
                    </div>
                    <div class="notice">
                        ⏱️ <strong>ملاحظة:</strong> صلاحية هذا الرابط هي <strong>15 دقيقة</strong> فقط من وقت استلام هذه الرسالة.
                    </div>
                    <p class="text" style="font-size: 13px; color: #64748b;">
                        إذا لم تكن أنت من أنشأ هذا الحساب أو طلبت هذا الإجراء، يمكنك تجاهل هذه الرسالة بأمان دون اتخاذ أي خطوة.
                    </p>
                    <div class="fallback">
                        إذا واجهت مشكلة في الضغط على الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:<br>
                        <a href="${verificationUrl}" style="color: #059669;">${verificationUrl}</a>
                    </div>
                </div>
                <div class="footer">
                    © 2026 مدرسة الهدى للقرآن الكريم — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
    `

    return await sendBrevoEmail({
        toEmail: email,
        toName: recipientName,
        subject: 'تأكيد البريد الإلكتروني - الهدى للقرآن',
        htmlContent
    })
}

/**
 * Send Arabic password reset email with 15-minute token via Brevo API
 * Supports: sendResetPasswordEmail(email, tokenOrUrl, recipientName)
 */
const sendResetPasswordEmail = async (email, tokenOrUrl, recipientName = '') => {
    let resetUrl = ''
    if (typeof tokenOrUrl === 'string' && (tokenOrUrl.startsWith('http://') || tokenOrUrl.startsWith('https://'))) {
        resetUrl = tokenOrUrl
    } else {
        const frontendUrl = getFrontendUrl()
        resetUrl = `${frontendUrl}/pages/auth/reset-password.html?token=${encodeURIComponent(tokenOrUrl)}`
    }

    const safeName = escapeHtml(recipientName.trim())
    const greeting = safeName
        ? `السلام عليكم ورحمة الله وبركاته، أهلاً بك يا <strong>${safeName}</strong>،`
        : 'السلام عليكم ورحمة الله وبركاته،'

    const htmlContent = `
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
                    <h1>مدرسة الهدى للقرآن الكريم</h1>
                </div>
                <div class="body">
                    <div class="greeting">${greeting}</div>
                    <p class="text">
                        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في مدرسة الهدى. يمكنك تعيين كلمة مرور جديدة من خلال الضغط على الزر أدناه:
                    </p>
                    <div class="btn-container">
                        <a href="${resetUrl}" class="btn" target="_blank">إعادة تعيين كلمة المرور</a>
                    </div>
                    <div class="notice">
                        ⏱️ <strong>تنبيه أمان:</strong> صلاحية هذا الرابط هي <strong>15 دقيقة</strong> فقط.
                    </div>
                    <p class="text" style="font-size: 13px; color: #64748b;">
                        إذا لم تكن قد طلبت إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة، فستبقى كلمة المرور الحالية آمنة كما هي.
                    </p>
                    <div class="fallback">
                        إذا واجهت مشكلة في الضغط على الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:<br>
                        <a href="${resetUrl}" style="color: #059669;">${resetUrl}</a>
                    </div>
                </div>
                <div class="footer">
                    © 2026 مدرسة الهدى للقرآن الكريم — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
    `

    return await sendBrevoEmail({
        toEmail: email,
        toName: recipientName,
        subject: 'إعادة تعيين كلمة المرور - الهدى للقرآن',
        htmlContent
    })
}

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendBrevoEmail,
    getFrontendUrl,
    escapeHtml
}
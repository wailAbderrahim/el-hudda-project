const { Resend } = require('resend')
require('dotenv').config()

let resendInstance = null

/**
 * Lazy initializer for Resend client to avoid crashing on boot if env vars are loaded dynamically
 */
const getResendClient = () => {
    const apiKey = (process.env.RESEND_API_KEY || '').trim()
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not defined in environment variables')
    }

    if (!resendInstance) {
        resendInstance = new Resend(apiKey)
    }
    return resendInstance
}

/**
 * Sender identity for emails sent through Resend
 * Defaults to 'El-Hudda <onboarding@resend.dev>' or custom verified domain via RESEND_FROM_EMAIL
 */
const getSenderEmail = () => {
    const customSender = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || '').trim()
    if (customSender) {
        return customSender
    }
    return 'El-Hudda <onboarding@resend.dev>'
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
 * Send Arabic verification email with 15-minute token via Resend API
 */
const sendVerificationEmail = async (email, token) => {
    const frontendUrl = getFrontendUrl()
    const verificationLink = `${frontendUrl}/pages/auth/verify-email.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    const fromAddress = getSenderEmail()

    try {
        const client = getResendClient()

        const { data, error } = await client.emails.send({
            from: fromAddress,
            to: [email],
            subject: 'تأكيد البريد الإلكتروني | مدرسة الهدى للقرآن الكريم',
            html: `
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
                    <div class="greeting">السلام عليكم ورحمة الله وبركاته،</div>
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
                    © 2026 مدرسة الهدى للقرآن الكريم — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
        `
        })

        if (error) {
            const errorMsg = error.message || 'Unknown Resend error'
            const err = new Error(errorMsg)
            err.code = 'EMAIL_SEND_FAILED'
            err.statusCode = 500
            throw err
        }

        return data
    } catch (err) {
        console.error(`Failed to send verification email: ${err.message}`)
        if (!err.statusCode) {
            err.statusCode = 500
            err.code = 'EMAIL_SEND_FAILED'
        }
        throw err
    }
}

/**
 * Send Arabic password reset email with 15-minute token via Resend API
 */
const sendResetPasswordEmail = async (email, token) => {
    const frontendUrl = getFrontendUrl()
    const resetLink = `${frontendUrl}/pages/auth/reset-password.html?token=${encodeURIComponent(token)}`
    const fromAddress = getSenderEmail()

    try {
        const client = getResendClient()

        const { data, error } = await client.emails.send({
            from: fromAddress,
            to: [email],
            subject: 'إعادة تعيين كلمة المرور | مدرسة الهدى للقرآن الكريم',
            html: `
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
                    © 2026 مدرسة الهدى للقرآن الكريم — جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
        `
        })

        if (error) {
            const errorMsg = error.message || 'Unknown Resend error'
            const err = new Error(errorMsg)
            err.code = 'EMAIL_SEND_FAILED'
            err.statusCode = 500
            throw err
        }

        return data
    } catch (err) {
        console.error(`Failed to send reset password email: ${err.message}`)
        if (!err.statusCode) {
            err.statusCode = 500
            err.code = 'EMAIL_SEND_FAILED'
        }
        throw err
    }
}

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    getFrontendUrl,
    getSenderEmail,
    transporter: null
}
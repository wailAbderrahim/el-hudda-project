const userModel = require('../models/userModel')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { sendVerificationEmail, sendResetPasswordEmail } = require('./emailService')
const crypto = require('crypto')

const registerUser = async (userData) => {
    const {
        firstName,
        lastName,
        phone,
        placeOfBirth,
        municipalityOfBirth,
        educationLevel,
        email,
        password
    } = userData

    if (
        !firstName || !firstName.trim() ||
        !lastName || !lastName.trim() ||
        !phone || !phone.trim() ||
        !placeOfBirth || !placeOfBirth.trim() ||
        !municipalityOfBirth || !municipalityOfBirth.trim() ||
        !educationLevel ||
        !email || !email.trim() ||
        !password
    ) {
        const err = new Error('All fields are required')
        err.statusCode = 400
        err.code = 'INVALID_INPUT'
        throw err
    }

    if (password.length < 8) {
        const err = new Error('Password must be at least 8 characters')
        err.statusCode = 400
        err.code = 'PASSWORD_TOO_SHORT'
        throw err
    }

    const normalizedEmail = email.trim().toLowerCase()

    const isExist = await userModel.findOne({ email: normalizedEmail })
    if (isExist) {
        if (isExist.isVerified) {
            const err = new Error('User already exists')
            err.statusCode = 400
            err.code = 'EMAIL_ALREADY_EXISTS'
            throw err
        }
        // If an unverified user exists from an earlier failed attempt, remove it so registration can proceed cleanly
        try {
            await userModel.findByIdAndDelete(isExist._id)
        } catch (cleanupErr) {
            console.error('Failed to clean up stale unverified user:', cleanupErr.message || cleanupErr)
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000)

    const user = await userModel.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: (userData.name && userData.name.trim()) || `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        placeOfBirth: placeOfBirth.trim(),
        municipalityOfBirth: municipalityOfBirth.trim(),
        educationLevel,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'student',
        isVerified: false,
        verificationToken: token,
        verificationTokenExpires: tokenExpires
    })

    try {
        await sendVerificationEmail(normalizedEmail, token)
    } catch (mailErr) {
        // Rollback user creation to prevent orphaned unverified accounts that cannot be activated
        try {
            await userModel.findByIdAndDelete(user._id)
        } catch (cleanupErr) {
            console.error('Failed to rollback user creation after email failure:', cleanupErr.message || cleanupErr)
        }
        const err = new Error('فشل إرسال بريد التفعيل، يرجى المحاولة مرة أخرى لاحقاً')
        err.statusCode = 500
        err.code = 'EMAIL_SEND_FAILED'
        throw err
    }

    return {
        success: true,
        message: 'User created successfully',
        data: {
            id: user._id,
            email: normalizedEmail,
            role: user.role
        }
    }
}

const resetPassword = async (token, newPassword) => {
    if (!token || !token.trim()) {
        const err = new Error('Reset token is required')
        err.statusCode = 400
        err.code = 'TOKEN_REQUIRED'
        throw err
    }

    if (!newPassword || newPassword.length < 8) {
        const err = new Error('Password must be at least 8 characters')
        err.statusCode = 400
        err.code = 'PASSWORD_TOO_SHORT'
        throw err
    }

    const user = await userModel.findOne({
        resetPasswordToken: token.trim()
    })

    if (!user) {
        const err = new Error('Invalid reset token')
        err.statusCode = 400
        err.code = 'INVALID_TOKEN'
        throw err
    }

    if (user.resetPasswordTokenExpires < new Date()) {
        const err = new Error('Reset password token has expired')
        err.statusCode = 400
        err.code = 'TOKEN_EXPIRED'
        throw err
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordTokenExpires = undefined
    await user.save()

    return {
        success: true,
        message: 'Password reset successfully'
    }
}

const forgotPassword = async (email) => {
    if (!email || !email.trim()) {
        const err = new Error('Email is required')
        err.statusCode = 400
        err.code = 'INVALID_INPUT'
        throw err
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await userModel.findOne({ email: normalizedEmail })

    // Safe response: do not expose whether an account exists
    if (!user) {
        return {
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000)

    user.resetPasswordToken = token
    user.resetPasswordTokenExpires = tokenExpires
    await user.save()

    try {
        await sendResetPasswordEmail(normalizedEmail, token)
    } catch (mailErr) {
        const err = new Error('فشل إرسال بريد إعادة تعيين كلمة المرور، يرجى المحاولة لاحقاً')
        err.statusCode = 500
        err.code = 'EMAIL_SEND_FAILED'
        throw err
    }

    return {
        success: true,
        message: 'Password reset email sent'
    }
}

const verifyEmail = async (token) => {
    if (!token || !token.trim()) {
        const err = new Error('Verification token is required')
        err.statusCode = 400
        err.code = 'TOKEN_REQUIRED'
        throw err
    }

    const user = await userModel.findOne({
        verificationToken: token.trim()
    })

    if (!user) {
        const err = new Error('Invalid verification token')
        err.statusCode = 400
        err.code = 'INVALID_VERIFICATION_TOKEN'
        throw err
    }

    if (user.verificationTokenExpires < new Date()) {
        const err = new Error('Verification token has expired')
        err.statusCode = 400
        err.code = 'VERIFICATION_TOKEN_EXPIRED'
        throw err
    }

    user.isVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpires = undefined
    await user.save()

    return {
        success: true,
        message: 'Email verified successfully',
        data: {
            email: user.email,
            isVerified: true
        }
    }
}

const resendRateLimitMap = new Map()

const resendVerification = async (email) => {
    if (!email || !email.trim()) {
        const err = new Error('Email is required')
        err.statusCode = 400
        err.code = 'INVALID_INPUT'
        throw err
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Rate limiting: allow at most once per 60 seconds per email
    const now = Date.now()
    const lastSent = resendRateLimitMap.get(normalizedEmail)
    if (lastSent && (now - lastSent) < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - (now - lastSent)) / 1000)
        const err = new Error(`يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة إرسال رابط التفعيل`)
        err.statusCode = 429
        err.code = 'RATE_LIMITED'
        throw err
    }

    const safeSuccessMessage = 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رابط تفعيل جديد صالح لمدة 15 دقيقة.'

    const user = await userModel.findOne({ email: normalizedEmail })

    // Safe response: do not expose whether an account exists
    if (!user) {
        return {
            success: true,
            message: safeSuccessMessage
        }
    }

    // If already verified, do not send another verification email
    if (user.isVerified === true) {
        return {
            success: true,
            code: 'ALREADY_VERIFIED',
            message: 'هذا البريد الإلكتروني مفعّل مسبقاً. يمكنك تسجيل الدخول مباشرة.',
            isAlreadyVerified: true
        }
    }

    // Generate new token (previous token becomes invalid)
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000)

    user.verificationToken = token
    user.verificationTokenExpires = tokenExpires
    await user.save()

    // Update rate limit timestamp
    resendRateLimitMap.set(normalizedEmail, now)

    // Send new verification email
    try {
        await sendVerificationEmail(normalizedEmail, token)
    } catch (emailErr) {
        resendRateLimitMap.delete(normalizedEmail)
        const err = new Error('فشل إرسال بريد التفعيل، يرجى المحاولة مرة أخرى لاحقاً')
        err.statusCode = 500
        err.code = 'EMAIL_SEND_FAILED'
        throw err
    }

    return {
        success: true,
        message: safeSuccessMessage
    }
}

const login = async (userData) => {
    const { email, password } = userData

    if (!email || !email.trim() || !password) {
        const err = new Error('Email and password are required')
        err.statusCode = 400
        err.code = 'INVALID_INPUT'
        throw err
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await userModel.findOne({ email: normalizedEmail })

    // 1. Check credentials
    if (!user) {
        const err = new Error('Invalid email or password')
        err.statusCode = 400
        err.code = 'INVALID_CREDENTIALS'
        throw err
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        const err = new Error('Invalid email or password')
        err.statusCode = 400
        err.code = 'INVALID_CREDENTIALS'
        throw err
    }

    // 2. Check account active status
    if (user.isActive === false) {
        const err = new Error('Your account is deactivated')
        err.statusCode = 403
        err.code = 'ACCOUNT_INACTIVE'
        err.isActive = false
        throw err
    }

    // 3. Check email verification
    if (user.isVerified === false) {
        const err = new Error('Please verify your email before logging in')
        err.statusCode = 403
        err.code = 'EMAIL_NOT_VERIFIED'
        err.isUnverified = true
        throw err
    }

    // 4. Create JWT
    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d'
        }
    )

    // Remove password from returned user
    user.password = undefined

    return {
        success: true,
        message: 'User successfully connected',
        token,
        user
    }
}

module.exports = {
    registerUser,
    login,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
}
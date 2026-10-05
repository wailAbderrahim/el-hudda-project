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
        !firstName ||
        !lastName ||
        !phone ||
        !placeOfBirth ||
        !municipalityOfBirth ||
        !educationLevel ||
        !email ||
        !password
    ) {
        throw new Error('all fields are required')
    }


    const normalizedEmail =
        email.trim().toLowerCase()


    const isExist =
        await userModel.findOne({
            email: normalizedEmail
        })


    if (isExist) {
        throw new Error('user is already exist')
    }


    const hashedPassword =
        await bcrypt.hash(password, 10)


    const token =
        crypto.randomBytes(32).toString('hex')


    const tokenExpires =
        new Date(
            Date.now() + 15 * 60 * 1000
        )


    const user =
        await userModel.create({

            firstName,
            lastName,

            name: `${firstName} ${lastName}`,

            phone,
            placeOfBirth,
            municipalityOfBirth,
            educationLevel,

            email: normalizedEmail,

            password: hashedPassword,

            role: 'student',

            isVerified: false,

            verificationToken: token,
            verificationTokenExpires: tokenExpires

        })


    try {
        await sendVerificationEmail(
            normalizedEmail,
            token
        )
    } catch (mailErr) {
        console.error('Failed to send verification email upon registration:', mailErr)
    }


    return {
        message: 'user created'
    }
}


const resetPassword = async (token, newPassword) => {

    const user = await userModel.findOne({
        resetPasswordToken: token
    })

    if (!user) {
        throw new Error('invalid token')
    }


    if (user.resetPasswordTokenExpires < new Date()) {
        throw new Error('Reset password token has expired')
    }


    const hashedPassword =
        await bcrypt.hash(newPassword, 10)


    user.password = hashedPassword

    user.resetPasswordToken = undefined
    user.resetPasswordTokenExpires = undefined

    await user.save()


    return {
        message: 'Password reset successfully'
    }
}


const forgotPassword = async (email) => {

    const user = await userModel.findOne({ email })

    if (!user) {
        throw new Error('user is not exist')
    }


    const token =
        crypto.randomBytes(32).toString('hex')

    const tokenExpires =
        new Date(Date.now() + 15 * 60 * 1000)


    user.resetPasswordToken = token
    user.resetPasswordTokenExpires = tokenExpires


    await user.save()


    await sendResetPasswordEmail(email, token)


    return {
        message: 'Password reset email sent'
    }
}


const verifyEmail = async (token) => {

    const user = await userModel.findOne({
        verificationToken: token
    })


    if (!user) {
        throw new Error('Invalid verification token')
    }


    if (user.verificationTokenExpires < new Date()) {
        throw new Error('Verification token has expired')
    }


    user.isVerified = true

    user.verificationToken = undefined
    user.verificationTokenExpires = undefined


    await user.save()


    return {
        message: 'Email verified successfully'
    }
}


const resendRateLimitMap = new Map()

const resendVerification = async (email) => {

    if (!email) {
        const err = new Error('البريد الإلكتروني مطلوب')
        err.statusCode = 400
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
        throw err
    }

    const safeSuccessMessage = 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رابط تفعيل جديد صالح لمدة 15 دقيقة.'

    const user = await userModel.findOne({ email: normalizedEmail })

    // Safe response: do not expose whether an account exists
    if (!user) {
        return {
            message: safeSuccessMessage
        }
    }

    // If already verified, do not send another verification email
    if (user.isVerified === true) {
        return {
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
        console.error('Failed to send verification email:', emailErr)
    }

    return {
        message: safeSuccessMessage
    }
}


const login = async (userData) => {

    const { email, password } = userData

    // Login requires email and password
    if (!email || !password) {
        const err = new Error('email and password are required')
        err.statusCode = 400
        throw err
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find user by email
    const user = await userModel.findOne({ email: normalizedEmail })

    // 1. Check credentials
    if (!user) {
        const err = new Error('invalid email or password please enter correct data')
        err.statusCode = 400
        throw err
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        const err = new Error('invalid email or password please enter correct data')
        err.statusCode = 400
        throw err
    }

    // 2. Check account active status
    if (user.isActive === false) {
        const err = new Error('Your account has been disabled. Please contact the administrator.')
        err.statusCode = 403
        err.code = 'ACCOUNT_DISABLED'
        err.isActive = false
        throw err
    }

    // 3. Check email verification
    if (user.isVerified === false) {
        const err = new Error('Your email address has not been verified yet. Please verify your email to continue.')
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
        message: 'user successfully connected',
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
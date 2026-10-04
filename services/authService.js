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


    await sendVerificationEmail(
        normalizedEmail,
        token
    )


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


const login = async (userData) => {

    const { email, password } = userData


    // Login only requires email and password
    if (!email || !password) {
        throw new Error('email and password are required')
    }


    // Find user by email
    const user = await userModel.findOne({ email })


    if (!user) {
        throw new Error('user is not exist')
    }


    // Check email verification
    if (!user.isVerified) {
        throw new Error(
            'Please verify your email before logging in'
        )
    }


    // Check password
    const isMatch =
        await bcrypt.compare(password, user.password)


    if (!isMatch) {
        throw new Error(
            'invalid email or password please enter correct data'
        )
    }


    // Check account status
    if (!user.isActive) {
        throw new Error(
            'Your account is deactivated. Please contact support for assistance.'
        )
    }


    // Create JWT
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
    forgotPassword,
    resetPassword
}
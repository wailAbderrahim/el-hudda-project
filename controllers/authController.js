const authService = require('../services/authService')

const registerUser = async (req, res) => {
    try {
        const result = await authService.registerUser(req.body)
        res.status(201).json({
            success: true,
            message: result.message,
            data: result.data || result
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'INVALID_INPUT',
            message: err.message
        })
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query

        if (!token || !token.trim()) {
            return res.status(400).json({
                success: false,
                code: 'TOKEN_REQUIRED',
                message: 'رمز التحقق مطلوب'
            })
        }

        const result = await authService.verifyEmail(token)
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data || result
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'INVALID_VERIFICATION_TOKEN',
            message: err.message
        })
    }
}

const login = async (req, res) => {
    try {
        const result = await authService.login(req.body)
        res.status(200).json({
            success: true,
            message: result.message,
            token: result.token,
            user: result.user,
            data: {
                token: result.token,
                user: result.user
            }
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'INVALID_CREDENTIALS',
            message: err.message,
            isUnverified: Boolean(err.isUnverified),
            email: err.email || undefined,
            isActive: err.isActive !== undefined ? err.isActive : null
        })
    }
}

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_INPUT',
                message: 'البريد الإلكتروني مطلوب'
            })
        }

        const result = await authService.resendVerification(email)
        res.status(200).json({
            success: true,
            code: result.code || null,
            message: result.message,
            isAlreadyVerified: Boolean(result.isAlreadyVerified)
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'UNKNOWN_ERROR',
            message: err.message
        })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body
        const result = await authService.resetPassword(token, newPassword)
        res.status(200).json({
            success: true,
            message: result.message
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'INVALID_TOKEN',
            message: err.message
        })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const result = await authService.forgotPassword(req.body.email)
        res.status(200).json({
            success: true,
            message: result.message
        })
    } catch (err) {
        const statusCode = err.statusCode || 400
        res.status(statusCode).json({
            success: false,
            code: err.code || 'UNKNOWN_ERROR',
            message: err.message
        })
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
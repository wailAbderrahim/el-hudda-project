const authService = require('../services/authService')


const registerUser = async (req, res) => {
    try {

        const user = await authService.registerUser(req.body)

        res.status(201).json(user)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const verifyEmail = async (req, res) => {
    try {

        const { token } = req.query

        if (!token) {
            return res.status(400).json({
                message: 'Verification token is required'
            })
        }

        const result = await authService.verifyEmail(token)

        res.status(200).json(result)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const login = async (req, res) => {
    try {

        const user = await authService.login(req.body)

        res.status(200).json(user)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const resetPassword = async (req, res) => {
    try {

        const {
            token,
            newPassword
        } = req.body

        const result =
            await authService.resetPassword(
                token,
                newPassword
            )

        res.status(200).json(result)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const forgotPassword = async (req, res) => {
    try {

        const result =
            await authService.forgotPassword(
                req.body.email
            )

        res.status(200).json(result)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


module.exports = {
    registerUser,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword
}
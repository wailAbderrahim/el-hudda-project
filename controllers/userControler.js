const userService = require('../services/userService')


const updateUserStatus = async (req, res) => {
    try {

        const { isActive } = req.body

        const user = await userService.updateUserStatus(
            req.params.id,
            isActive,
            req.user._id
        )

        res.status(200).json(user)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const updateUser = async (req, res) => {
    try {

        const updatedUser = await userService.updateUser(
            req.params.id,
            req.body
        )

        res.status(200).json(updatedUser)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const getUsersById = async (req, res) => {
    try {

        const user = await userService.getUserById(
            req.params.id
        )

        res.status(200).json(user)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const getUsers = async (req, res) => {
    try {

        const users = await userService.getUsers()

        res.status(200).json(users)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const getProfile = async (req, res) => {
    try {

        const user = req.user
        const profile = await userService.getProfile(user._id)

        res.status(200).json(profile)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const updateProfile = async (req, res) => {
    try {

        const userId = req.user._id

        const updatedUser = await userService.updateUserProfile(
            userId,
            req.body
        )

        res.status(200).json(updatedUser)

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


const changePassword = async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body

        const userId = req.user._id

        await userService.changePassword(
            userId,
            currentPassword,
            newPassword
        )

        res.status(200).json({
            message: 'Password changed successfully'
        })

    } catch (err) {

        res.status(400).json({
            message: err.message
        })

    }
}


module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getUsers,
    getUsersById,
    updateUser,
    updateUserStatus
}

const notificationService = require('../services/notificationService')

const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(
            req.user._id
        )

        res.status(200).json(notifications)
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

const getNotificationById = async (req, res) => {
    try {
        const notification = await notificationService.getNotificationById(
            req.params.id,
            req.user._id
        )

        res.status(200).json(notification)
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

const markUsRead = async (req, res) => {
    try {
        const notification = await notificationService.markUsRead(
            req.params.id,
            req.user._id
        )

        res.status(200).json(notification)
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

const markUsReadAll = async (req, res) => {
    try {
        const notifications = await notificationService.markUsReadAll(
            req.user._id
        )

        res.status(200).json(notifications)
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

const deleteNotification = async (req, res) => {
    try {
        const result = await notificationService.deleteNotification(
            req.params.id,
            req.user._id
        )

        res.status(200).json({
            message: result
        })
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

module.exports = {
    getNotifications,
    getNotificationById,
    markUsRead,
    markUsReadAll,
    deleteNotification
}


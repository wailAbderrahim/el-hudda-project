
const express = require('express')
const router = express.Router()

const authMidllware = require('../midllwares/authMidllware')
const notificationController = require('../controllers/notificationConroller')


// Get all notifications of current user
router.get(
    '/',
    authMidllware,
    notificationController.getNotifications
)


// Mark all notifications as read
router.patch(
    '/read-all',
    authMidllware,
    notificationController.markUsReadAll
)


// Get notification by id
router.get(
    '/:id',
    authMidllware,
    notificationController.getNotificationById
)


// Mark one notification as read
router.patch(
    '/:id/read',
    authMidllware,
    notificationController.markUsRead
)


// Delete all notifications of current user
router.delete(
    '/',
    authMidllware,
    notificationController.deleteAllNotifications
)


// Delete notification
router.delete(
    '/:id',
    authMidllware,
    notificationController.deleteNotification
)


module.exports = router












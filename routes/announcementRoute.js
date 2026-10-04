const express = require('express')
const router = express.Router()

const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')

const announcementController = require('../controllers/AnnouncementController')


const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer')) {
            const token = authHeader.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await userModel.findById(decoded.id).select('-password')
            if (user) req.user = user
        }
    } catch (e) {}
    next()
}

router.post(
    '/',
    authMidllware,
    roleMidlleWare('admin'),
    announcementController.createAnnounecement
)

router.get(
    '/',
    optionalAuth,
    announcementController.getAnnouncment
)

router.get(
    '/:id',
    optionalAuth,
    announcementController.getAnnouncmentById
)

router.put(
    '/:id',
    authMidllware,
    roleMidlleWare('admin'),
    announcementController.updateAnnouncment
)

router.delete(
    '/:id',
    authMidllware,
    roleMidlleWare('admin'),
    announcementController.deleteAnnouncment
)


module.exports = router
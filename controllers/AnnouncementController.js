const announcementService = require('../services/announcmentService')

const createAnnounecement = async (req, res) => {
    try {
        const announcement = await announcementService.createAnnounecement(
            req.body,
            req.user
        )

        res.status(201).json(announcement)
    } catch (err) {
        res.status(400).json({
            message: err.message
        })
    }
}

const getAnnouncment = async (req, res) => {
    try {
        const announcements = await announcementService.getAnnouncment(req.user)

        res.status(200).json(announcements)
    } catch (err) {
        res.status(400).json({
            message: err.message
        })
    }
}

const getAnnouncmentById = async (req, res) => {
    try {
        const announcement = await announcementService.getAnnouncmentById(
            req.params.id
        )

        res.status(200).json(announcement)
    } catch (err) {
        res.status(400).json({
            message: err.message
        })
    }
}

const updateAnnouncment = async (req, res) => {
    try {
        const announcement = await announcementService.updateAnnouncment(
            req.body,
            req.params.id,
            req.user
        )

        res.status(200).json(announcement)
    } catch (err) {
        res.status(400).json({
            message: err.message
        })
    }
}

const deleteAnnouncment = async (req, res) => {
    try {
        const announcement = await announcementService.deleteAnnouncment(
            req.params.id,
            req.user
        )

        res.status(200).json({
            message: announcement
        })
    } catch (err) {
        res.status(400).json({
            message: err.message
        })
    }
}

module.exports = {
    createAnnounecement,
    getAnnouncment,
    getAnnouncmentById,
    updateAnnouncment,
    deleteAnnouncment
}
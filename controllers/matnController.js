const matnService = require('../services/matnService')

const getMatns = async (req, res) => {
    try {
        const matns = await matnService.getMatns(req.user)
        res.status(200).json(matns)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getMatnById = async (req, res) => {
    try {
        const matn = await matnService.getMatnById(req.params.id)
        res.status(200).json(matn)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const createMatn = async (req, res) => {
    try {
        const matn = await matnService.createMatn(req.body, req.user)
        res.status(201).json(matn)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const updateMatn = async (req, res) => {
    try {
        const matn = await matnService.updateMatn(req.params.id, req.body, req.user)
        res.status(200).json(matn)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const deleteMatn = async (req, res) => {
    try {
        const result = await matnService.deleteMatn(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getMatnProgress = async (req, res) => {
    try {
        const progress = await matnService.getMatnProgress(req.user)
        res.status(200).json(progress)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getStudentMatnProgressByStudentId = async (req, res) => {
    try {
        const progress = await matnService.getStudentMatnProgressByStudentId(req.params.studentId, req.user)
        res.status(200).json(progress)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const createStudentMatnProgress = async (req, res) => {
    try {
        const progress = await matnService.createStudentMatnProgress(req.body, req.user)
        res.status(201).json(progress)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const updateStudentMatnProgress = async (req, res) => {
    try {
        const progress = await matnService.updateStudentMatnProgress(req.params.id, req.body, req.user)
        res.status(200).json(progress)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const deleteStudentMatnProgress = async (req, res) => {
    try {
        const result = await matnService.deleteStudentMatnProgress(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

module.exports = {
    getMatns,
    getMatnById,
    createMatn,
    updateMatn,
    deleteMatn,
    getMatnProgress,
    getStudentMatnProgressByStudentId,
    createStudentMatnProgress,
    updateStudentMatnProgress,
    deleteStudentMatnProgress
}


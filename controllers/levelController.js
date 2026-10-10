const levelService = require('../services/levelService')

const getLevels = async (req, res) => {
    try {
        const levels = await levelService.getLevels(req.user)
        res.status(200).json(levels)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getLevelById = async (req, res) => {
    try {
        const level = await levelService.getLevelById(req.params.id)
        res.status(200).json(level)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const createLevel = async (req, res) => {
    try {
        const level = await levelService.createLevel(req.body, req.user)
        res.status(201).json(level)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const updateLevel = async (req, res) => {
    try {
        const level = await levelService.updateLevel(req.params.id, req.body, req.user)
        res.status(200).json(level)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const deleteLevel = async (req, res) => {
    try {
        const result = await levelService.deleteLevel(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getStudentsByLevel = async (req, res) => {
    try {
        const students = await levelService.getStudentsByLevel(req.params.id, req.user)
        res.status(200).json(students)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const assignStudentLevel = async (req, res) => {
    try {
        const result = await levelService.assignStudentLevel(req.body, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getStudentLevelHistory = async (req, res) => {
    try {
        const history = await levelService.getStudentLevelHistory(req.params.studentId, req.user)
        res.status(200).json(history)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

module.exports = {
    getLevels,
    getLevelById,
    createLevel,
    updateLevel,
    deleteLevel,
    getStudentsByLevel,
    assignStudentLevel,
    getStudentLevelHistory
}


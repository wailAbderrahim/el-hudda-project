const examService = require('../services/examService')

const getExams = async (req, res) => {
    try {
        const exams = await examService.getExams(req.user)
        res.status(200).json(exams)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getExamById = async (req, res) => {
    try {
        const exam = await examService.getExamById(req.params.id, req.user)
        res.status(200).json(exam)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const createExam = async (req, res) => {
    try {
        const exam = await examService.createExam(req.body, req.user)
        res.status(201).json(exam)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const updateExam = async (req, res) => {
    try {
        const exam = await examService.updateExam(req.params.id, req.body, req.user)
        res.status(200).json(exam)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const deleteExam = async (req, res) => {
    try {
        const result = await examService.deleteExam(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const startExamAttempt = async (req, res) => {
    try {
        const result = await examService.startExamAttempt(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message, code: err.code })
    }
}

const saveExamProgress = async (req, res) => {
    try {
        const result = await examService.saveExamProgress(req.params.id, req.body.answers, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message, code: err.code })
    }
}

const submitExamAttempt = async (req, res) => {
    try {
        const result = await examService.submitExamAttempt(req.params.id, req.body.answers, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message, code: err.code })
    }
}

const getExamAttempts = async (req, res) => {
    try {
        const attempts = await examService.getExamAttempts(req.params.id, req.user)
        res.status(200).json(attempts)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const gradeAttempt = async (req, res) => {
    try {
        const attempt = await examService.gradeAttempt(req.params.attemptId, req.body, req.user)
        res.status(200).json(attempt)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const publishExamResults = async (req, res) => {
    try {
        const result = await examService.publishExamResults(req.params.id, req.user)
        res.status(200).json(result)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

const getStudentResults = async (req, res) => {
    try {
        const results = await examService.getStudentResults(req.params.studentId, req.user)
        res.status(200).json(results)
    } catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message })
    }
}

module.exports = {
    getExams,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
    startExamAttempt,
    saveExamProgress,
    submitExamAttempt,
    getExamAttempts,
    gradeAttempt,
    publishExamResults,
    getStudentResults
}


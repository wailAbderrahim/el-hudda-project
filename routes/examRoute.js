const express = require('express')
const router = express.Router()
const examController = require('../controllers/examController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')

router.use(authMidllware)

router.get('/student-results/:studentId', examController.getStudentResults)
router.get('/:id/attempts', roleMidlleWare('admin', 'teacher'), examController.getExamAttempts)
router.put('/attempts/:attemptId/grade', roleMidlleWare('admin', 'teacher'), examController.gradeAttempt)
router.patch('/:id/publish-results', roleMidlleWare('admin', 'teacher'), examController.publishExamResults)

router.post('/:id/start', roleMidlleWare('student'), examController.startExamAttempt)
router.put('/:id/save-progress', roleMidlleWare('student'), examController.saveExamProgress)
router.post('/:id/submit', roleMidlleWare('student'), examController.submitExamAttempt)

router.get('/', examController.getExams)
router.get('/:id', examController.getExamById)
router.post('/', roleMidlleWare('admin', 'teacher'), examController.createExam)
router.put('/:id', roleMidlleWare('admin', 'teacher'), examController.updateExam)
router.delete('/:id', roleMidlleWare('admin', 'teacher'), examController.deleteExam)

module.exports = router


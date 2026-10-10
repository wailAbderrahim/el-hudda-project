const express = require('express')
const router = express.Router()
const levelController = require('../controllers/levelController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')

router.use(authMidllware)

router.get('/', levelController.getLevels)
router.get('/:id', levelController.getLevelById)
router.post('/', roleMidlleWare('admin'), levelController.createLevel)
router.put('/:id', roleMidlleWare('admin'), levelController.updateLevel)
router.delete('/:id', roleMidlleWare('admin'), levelController.deleteLevel)

router.get('/:id/students', roleMidlleWare('admin', 'teacher'), levelController.getStudentsByLevel)
router.post('/assign', roleMidlleWare('admin', 'teacher'), levelController.assignStudentLevel)
router.get('/history/:studentId', levelController.getStudentLevelHistory)

module.exports = router


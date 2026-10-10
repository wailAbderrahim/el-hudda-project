const express = require('express')
const router = express.Router()
const matnController = require('../controllers/matnController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')

router.use(authMidllware)

router.get('/progress', matnController.getMatnProgress)
router.get('/progress/student/:studentId', matnController.getStudentMatnProgressByStudentId)
router.post('/progress', roleMidlleWare('admin', 'teacher'), matnController.createStudentMatnProgress)
router.put('/progress/:id', roleMidlleWare('admin', 'teacher'), matnController.updateStudentMatnProgress)
router.delete('/progress/:id', roleMidlleWare('admin', 'teacher'), matnController.deleteStudentMatnProgress)

router.get('/', matnController.getMatns)
router.get('/:id', matnController.getMatnById)
router.post('/', roleMidlleWare('admin'), matnController.createMatn)
router.put('/:id', roleMidlleWare('admin'), matnController.updateMatn)
router.delete('/:id', roleMidlleWare('admin'), matnController.deleteMatn)

module.exports = router


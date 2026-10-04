const halaqaController = require('../controllers/halaqaController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')   

const express = require('express')

const router = express.Router()

router.post('/', authMidllware, roleMidlleWare('admin'), halaqaController.createHalaqa)
router.get('/', halaqaController.getHalaqas)
router.get('/:id', authMidllware, roleMidlleWare('admin'), halaqaController.getHalaqaByid)
router.post('/:id/students',authMidllware, roleMidlleWare('admin'), halaqaController.addStudentToHalqa )
router.delete('/:id/students/:studentId',authMidllware,roleMidlleWare('admin'),halaqaController.removeStudentFromHalaqa)
router.put('/:id',authMidllware,roleMidlleWare('admin'),halaqaController.updateHalaqa)
router.patch('/:id/status',authMidllware,roleMidlleWare('admin'),halaqaController.updateHalaqaStatus)

module.exports = router
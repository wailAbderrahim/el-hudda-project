const express = require('express')
const attendanceController = require('../controllers/attendanceController')
const authMidllWare = require('../midllwares/authMidllware')
const roleMiddlWare = require('../midllwares/roleMidllware')


const router = express.Router()


router.post('/',authMidllWare,roleMiddlWare('admin', 'teacher'), attendanceController.createAttendance)
router.get('/',authMidllWare,roleMiddlWare('admin', 'teacher', 'student'), attendanceController.getAttendances )
router.get('/:id',authMidllWare,roleMiddlWare('admin', 'teacher', 'student'), attendanceController.getAttendancesById )
router.patch('/:id',authMidllWare,roleMiddlWare('admin', 'teacher'), attendanceController.updateAttendance )
router.delete('/:id',authMidllWare,roleMiddlWare('admin', 'teacher'), attendanceController.deleteAttendance)






module.exports = router
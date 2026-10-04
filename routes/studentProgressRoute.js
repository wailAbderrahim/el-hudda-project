const express = require('express')
const studentProgressController = require('../controllers/studentProgressController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')


const router = express.Router()


router.get('/:id',authMidllware, roleMidlleWare('admin', 'teacher', 'student'), studentProgressController.getStudentProgress)


module.exports = router
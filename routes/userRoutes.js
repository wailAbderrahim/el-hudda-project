const userController = require('../controllers/userControler')

const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')

const express = require('express')




const router = express.Router()
router.get('/profile', authMidllware, userController.getProfile)
router.put('/profile', authMidllware, userController.updateProfile)
router.put('/change-password', authMidllware, userController.changePassword)

router.get('/', authMidllware, roleMidlleWare('admin'), userController.getUsers)
router.get('/:id', authMidllware, roleMidlleWare('admin'), userController.getUsersById)
router.put('/:id', authMidllware, roleMidlleWare('admin'), userController.updateUser)
router.patch('/:id/status', authMidllware, roleMidlleWare('admin'), userController.updateUserStatus)

module.exports = router
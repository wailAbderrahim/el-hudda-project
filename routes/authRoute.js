const express = require('express')
const authController = require('../controllers/authController')



const router = express.Router()

router.post('/register', authController.registerUser)
router.post('/login', authController.login)
router.get('/verify-email', authController.verifyEmail)
router.post('/verify-email', authController.verifyEmail)
router.post('/resend-verification', authController.resendVerification)
router.post('/forgot-password', authController.forgotPassword)  
router.post('/reset-password', authController.resetPassword)


module.exports = router
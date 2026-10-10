const express = require('express')
const router = express.Router()

const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')
const dashboardController = require('../controllers/dashBoardController')

router.get(
    '/',
    authMidllware,
    roleMidlleWare('admin', 'teacher'),
    dashboardController.getDashboardStats
)

module.exports = router
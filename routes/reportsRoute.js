const express = require('express')
const router = express.Router()

const authMidllware = require('../midllwares/authMidllware')
const reportController = require('../controllers/reportsController')

router.get(
    '/student/:id',
    authMidllware,
    reportController.getStudentsReport
)
router.get( '/halaqa/:id', authMidllware, reportController.getHalaqaReport )
module.exports = router
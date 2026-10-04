const express = require('express')
const memorizationController = require('../controllers/memorizationController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')   




const router = express.Router()


router.post('/', authMidllware, roleMidlleWare('admin', 'teacher'), memorizationController.createMemorization)
router.get('/', authMidllware, roleMidlleWare('admin', 'teacher', 'student'), memorizationController.getMemorizaion)
router.get('/:id',authMidllware, roleMidlleWare('admin', 'teacher', 'student'), memorizationController.getMemorizationById )
router.put('/:id',authMidllware, roleMidlleWare('admin', 'teacher'), memorizationController.updateMemorization)
router.delete('/:id',authMidllware, roleMidlleWare('admin', 'teacher'), memorizationController.deleteMemorization)







module.exports = router
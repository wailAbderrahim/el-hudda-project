const express = require('express')
const evaluationController = require('../controllers/evaluationController')
const authMidllware = require('../midllwares/authMidllware')
const roleMidlleWare = require('../midllwares/roleMidllware')   


const router = express.Router()



router.post('/',authMidllware, roleMidlleWare('admin', 'teacher'), evaluationController.createEvaluation)
router.get('/',authMidllware, roleMidlleWare('admin', 'teacher', 'student'), evaluationController.getEvaluation)
router.get('/:id',authMidllware, roleMidlleWare('admin', 'teacher', 'student'), evaluationController.getEvaluationById)
router.put('/:id',authMidllware, roleMidlleWare('admin', 'teacher'), evaluationController.updateEvaluation )
router.delete('/:id',authMidllware, roleMidlleWare('admin', 'teacher'), evaluationController.deleteEvaluation)


module.exports = router
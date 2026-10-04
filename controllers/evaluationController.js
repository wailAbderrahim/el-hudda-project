const evaluationService = require('../services/evaluationService')

const createEvaluation = async (req,res)=>{
    try{
        const evaluation = await evaluationService.createEvaluation(req.body, req.user)
        res.status(200).json(evaluation)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const getEvaluation = async (req,res)=>{
    try{
        const evaluation = await evaluationService.getEvaluation(req.user)
        res.status(200).json(evaluation)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const getEvaluationById = async (req,res)=>{
    try{
        const evaluation = await evaluationService.getEvaluationById(req.params.id, req.user)
        res.status(200).json(evaluation)        
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const updateEvaluation = async (req,res)=>{
    try{
        const evaluation = await evaluationService.updateEvaluation(req.body, req.params.id, req.user)
        res.status(200).json(evaluation)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const deleteEvaluation = async(req,res)=>{
    try{
        const evaluation = await evaluationService.deleteEvaluation(req.params.id, req.user)
        res.status(200).json(evaluation)
    }catch(err){
        res.status(400).json({message:err.message})
    }    
}

module.exports = {
    createEvaluation,
    getEvaluation,
    getEvaluationById,
    updateEvaluation,
    deleteEvaluation

}
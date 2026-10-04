const memorizationService = require('../services/memorizatinService')


const createMemorization = async (req,res)=>{
    try{
        const memorization = await memorizationService.createMemorization(req.body, req.user)
        res.status(200).json(memorization)
    }catch(err){
        res.status(400).json({message: err.message})
    }
}

const getMemorizaion = async (req,res)=>{
    try{
        const memorization = await memorizationService.getMemorization(req.user)
        res.status(200).json(memorization)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}
 
const getMemorizationById = async(req,res)=>{
    try{
        const memorization = await memorizationService.getMemorizationById(req.params.id, req.user)
        res.status(200).json(memorization)
    }catch(err){
        res.status(400).json({message:err.message})
    }

}

const updateMemorization = async(req,res)=>{
    try{
        const memorization = await memorizationService.updateMemorization(req.body, req.params.id, req.user)
        res.status(200).json(memorization)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}


const deleteMemorization = async(req,res)=>{
    try{
        const memorization = await memorizationService.deleteMemorization(req.params.id, req.user)
        res.status(200).json(memorization)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}


module.exports = {
    createMemorization,
    getMemorizaion,
    getMemorizationById,
    updateMemorization,
    deleteMemorization
}
const halaqaService = require('../services/halaqaServices')

const createHalaqa = async (req,res)=>{
    try{

        const halaqa = await halaqaService.createHalaqa(req.body)
        res.status(201).json(halaqa)

    }catch(err){
        res.status(400).json({
            message: err.message
        })
    }
}

const getHalaqas = async (req, res)=>{
    try{
        const halaqas = await halaqaService.getHalaqas()
        res.status(200).json(halaqas)
    }catch(err){
        res.status(400).json({message:err.message})
    }

}

const getHalaqaByid = async (req,res)=>{
    try{

        const halaqa = await halaqaService.getHalaqaById(req.params.id)
        res.status(200).json(halaqa)

    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const addStudentToHalqa = async (req,res)=>{
    try{
        const {studentId} = req.body
        const halaqa = await halaqaService.addStudentToHalqa(req.params.id,studentId)
        res.status(200).json(halaqa)
    }catch(err){
        res.status(400).json({ message: err.message })
    }
}

const removeStudentFromHalaqa = async (req,res)=>{
    try{
          
     const halaqa = await halaqaService.removeStudentFromHalaqa(req.params.id,req.params.studentId)
        res.status(200).json(halaqa)
        }catch(err){
        res.status(400).json({ message: err.message })
    }
}

const updateHalaqa = async (req,res)=>{
    try{
        const halaqa = await halaqaService.updateHalaqa(req.params.id, req.body)
        res.status(200).json(halaqa)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}


const updateHalaqaStatus = async (req,res)=>{
    try{
        const {isActive} = req.body
        const halaqa = await halaqaService.updateHalaqaStatus(req.params.id,isActive)
        res.status(200).json(halaqa)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}




module.exports = {
    createHalaqa,
    getHalaqas,
    getHalaqaByid,
    addStudentToHalqa,
    removeStudentFromHalaqa,
    updateHalaqa,
    updateHalaqaStatus
}   
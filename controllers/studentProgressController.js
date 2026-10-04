const StudentProgressService = require('../services/studentProgressService')



const getStudentProgress = async (req,res)=>{
    try{
        const studentProgress = await StudentProgressService.getStudentProgress(req.params.id, req.user)
        res.status(200).json(studentProgress)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

module.exports = {
    getStudentProgress
}
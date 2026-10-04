const attendanceService = require('../services/attendanceService')

const createAttendance = async (req,res)=>{
    try{
        const attendance = await attendanceService.createAttendance(req.body, req.user)
        res.status(200).json(attendance)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}

const getAttendances = async (req,res)=>{
    try{    



        const attendances = await attendanceService.getAttendances(req.user)

        res.status(200).json(attendances)
    }catch(err){
        res.status(400).json({message: err.message})
    }
}

const getAttendancesById = async (req,res)=>{
    try{
        const attendance = await attendanceService.getAttendancesById(req.params.id, req.user)
        res.status(200).json(attendance)

    }catch(err){
        res.status(400).json({message: err.message})
        
    }
}

const updateAttendance = async (req,res)=>{
    try{
        const attendance = await attendanceService.updateAttendance(req.body, req.params.id, req.user)
        res.status(200).json(attendance)
    }catch(err){
        res.status(400).json({message: err.message})
    }
}


const deleteAttendance = async (req,res)=>{
    try{

        const attendance = await attendanceService.deleteAttendance(req.params.id,req.user)
        res.status(200).json(attendance)
    }catch(err){
        res.status(400).json({message: err.message})
    }
}










module.exports = {
    createAttendance,
    getAttendances,
    getAttendancesById,
    updateAttendance,
    deleteAttendance
}
const Attendance = require('../models/attendanceModel')
const User = require('../models/userModel')
const Halaqa =  require('../models/halaqaModel')

const createAttendance = async (attendanceData, user)=>{

    const {halaqa, student, date, status} = attendanceData
    const halaqaData = await Halaqa.findById(halaqa)
    const studentUser = await User.findById(student)



    if(!halaqaData){
        throw new Error('halaqa not found')
    }
    if(user.role === 'teacher' && halaqaData.teacher.toString() !== user._id.toString()){
        throw new Error('You are not the teacher of this halaqa')
    }
    if(!studentUser){
        throw new Error('student not found')

    }
    if(studentUser.role !== 'student'){
        throw new Error('user is not a student')

    }
    const isStudentExist = halaqaData.students.some(id => id.toString() === student.toString())

    if(!isStudentExist){

        throw new Error('student is not from this halaqa')

    }

    if (!date || !status) {
    throw new Error('date and status are required')
    }

     
    const allowedStatus = ['present', 'absent', 'late']

    if (!allowedStatus.includes(status)) {
        throw new Error('invalid attendance status')
    }

    const attendanceDate = new Date(date)

    if (isNaN(attendanceDate.getTime())) {
        throw new Error('invalid date')
    }
    attendanceDate.setHours(0, 0, 0, 0)

    const isAttendanceExist = await Attendance.findOne({
        halaqa,
        student,
        date: attendanceDate
    })

    if(isAttendanceExist){
        throw new Error('attendance is already exist')

    }


    const attendance = await Attendance.create({
        halaqa,
        student,
        date: attendanceDate,
        status
    })

    return attendance

}

const getAttendances = async (user)=>{
    
    if(user.role === 'admin'){
        return await Attendance.find()
        .populate('student', 'name email')
        .populate('halaqa', 'name')
    }
    if(user.role === 'teacher'){
        const halaqas = await Halaqa.find({ teacher: user._id })
        const halaqaIds = halaqas.map(halaqa => halaqa._id)
        const teacherAttendances = await Attendance.find({halaqa: { $in: halaqaIds }})
            .populate('student', 'name email')
            .populate('halaqa', 'name')
        return teacherAttendances
    }

    if(user.role === 'student'){
        const studentAttendances = await Attendance.find({ student: user._id })
            .populate('student', 'name email')
            .populate('halaqa', 'name')
            .sort({ date: -1 })
        return studentAttendances
    }

    throw new Error('Unauthorized')
}


const getAttendancesById = async (attendanceId, user)=>{
    const attendance = await Attendance.findById(attendanceId)
            .populate('student', 'name email')
            .populate('halaqa', 'name')

    if(!attendance){
        throw new Error('attendance not found')
    }        

    if(user.role === 'admin'){
        return attendance

    }
    if(user.role === 'teacher'){
        const halaqa = await Halaqa.findById(attendance.halaqa._id)
    if (!halaqa) {
        throw new Error('halaqa not found')
        }
        if(halaqa.teacher.toString()!== user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }
        return attendance        
    }

    if(user.role === 'student'){
        const studentId = attendance.student && attendance.student._id ? attendance.student._id.toString() : attendance.student.toString()
        if(studentId !== user._id.toString()){
            throw new Error('you are not authorized')
        }
        return attendance
    }

    throw new Error('Unauthorized')
}

const updateAttendance = async (attendanceData, attendanceId, user)=>{
    const {status} = attendanceData
    const allowedStatus = ['present', 'absent', 'late']
    const attendance = await Attendance.findById(attendanceId)
    if(!attendance){
        throw new Error('attendance not found')
    }
    const halaqaData = await Halaqa.findById(attendance.halaqa)
    if(!halaqaData){
        throw new Error('halaqa not found')
    }

        if(user.role === 'teacher' && halaqaData.teacher.toString() !== user._id.toString()){
        throw new Error('You are not the teacher of this halaqa')
    }

    if(!status){
        throw new Error('status required')
    }
    



    if(!allowedStatus.includes(status)){
        throw new Error('status are not allowed')
    }
    

    attendance.status = status

    await attendance.save()

    return attendance

}

const deleteAttendance = async (attendanceId, user) =>{

    const attendance = await Attendance.findById(attendanceId)
    if(!attendance){
        throw new Error('attendance not found')
    }
    const halaqaData = await Halaqa.findById(attendance.halaqa)
    if(!halaqaData){
        throw new Error('halaqa not found')
    }
    if(user.role === 'teacher' && halaqaData.teacher.toString() !== user._id.toString()){
        throw new Error('You are not the teacher of this halaqa')
    }
    await attendance.deleteOne()

    return {message: 'attendance is successfully deleted'}
}




module.exports = {
    createAttendance,
    getAttendances,
    getAttendancesById,
    updateAttendance,
    deleteAttendance
}
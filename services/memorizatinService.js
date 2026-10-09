const Memorization = require('../models/memorizatonModel')
const Halaqa = require('../models/halaqaModel')
const User = require('../models/userModel')
const notificationService = require('./notificationService')


const createMemorization = async (memorizationData, user)=>{
    const {student, halaqa, surah, fromVerse, toVerse, date} = memorizationData
    const halaqaData = await Halaqa.findById(halaqa)
    if(!halaqaData){
        throw new Error('halqa are not found')
    }
    const studentData = await User.findById(student)
    if(!studentData){
        throw new Error('student are not found')
    }
    if(studentData.role !== 'student'){
        throw new Error('user is not student of this halaqa')
    }
    const isStudents = halaqaData.students.some(id => id.toString() === studentData._id.toString())
    if(!isStudents){
        throw new Error('student is not from this halaqa')
    }

    if(user.role === 'teacher' ){
        if(halaqaData.teacher.toString() !== user._id.toString()){
            throw new Error('you are not a teacher of this halaqa')
        }

    }
    if(user.role !== 'admin' && user.role !== 'teacher'){
        throw new Error('access denied')
    }

    if(!surah){
        throw new Error('surah is required')
    }
    if( typeof fromVerse !== 'number' || fromVerse <= 0){
        throw new Error('from verse must be a positive number')
    }
    if( typeof toVerse !== 'number' || toVerse <= 0){
        throw new Error('to verse must be a positive number')
    }

    if(fromVerse > toVerse){
        throw new Error('to verse must be greater then from verse ')


    }

    

    if (!date) {
        throw new Error('date is required')
    }
    const newMemorizationdate = new Date(date)

    if(isNaN(newMemorizationdate.getTime())){
        throw new Error('invalid date')
    }

    newMemorizationdate.setHours(0, 0, 0, 0)

    const memorization = await Memorization.create({
            student,
            halaqa,
            surah,
            fromVerse,
            toVerse,
            date:newMemorizationdate
        })

    await notificationService.createNotification({
        recipient:student,
        title:'تسميع جديد',
        message:`سورة ${surah}، من الآية ${fromVerse} إلى ${toVerse}`,
        type:'memorization'
    })    
    return memorization




}

const getMemorization = async (user)=>{

    if(user.role === 'admin'){
        return await Memorization.find()
            .populate('student', 'name email')
            .populate('halaqa', 'name')
         
    }   

    if(user.role === 'teacher'){
        const halaqas = await Halaqa.find({
            teacher: user._id
        }).select('_id')

        const halaqaIds = halaqas.map(halaqa => halaqa._id)
        return await Memorization.find({
            halaqa: { $in: halaqaIds }
        })
            .populate('student', 'name email')
            .populate('halaqa', 'name teacher')

    }

    if(user.role === 'student'){
        return await Memorization.find({ student: user._id })
            .populate('student', 'name email')
            .populate('halaqa', 'name')
            .sort({ date: -1 })
    }

    throw new Error('Unauthorized')
    

      
}

const getMemorizationById = async(memorizationId, user)=>{
    const memorization = await Memorization.findById(memorizationId)
    if(!memorization){
        throw new Error('memorization not found')
    }
    if(user.role === 'admin'){

        return memorization
    }
    if(user.role === 'teacher'){
        const halaqa = await Halaqa.findById(memorization.halaqa)
        if(!halaqa){
            throw new Error('halaqa not found')
        }
        if(halaqa.teacher.toString() !==  user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }
        return memorization
    }
    if(user.role === 'student'){
        if(memorization.student.toString() !== user._id.toString()){
            throw new Error('Unauthorized')
        }
        return memorization
    }
    throw new Error('Unauthorized')
}


const updateMemorization = async (memorizationData, memorizationid, user) => {
    const { surah, fromVerse, toVerse, date } = memorizationData

    const memorization = await Memorization.findById(memorizationid)

    if (!memorization) {
        throw new Error('memorization not found')
    }

    const halaqaData = await Halaqa.findById(memorization.halaqa)

    if (!halaqaData) {
        throw new Error('halaqa not found')
    }

    // Authorization
    if (user.role === 'teacher') {
        if (halaqaData.teacher.toString() !== user._id.toString()) {
            throw new Error('you are not teacher of this halaqa')
        }
    }

    if (user.role !== 'admin' && user.role !== 'teacher') {
        throw new Error('unauthorized')
    }

    // Get the final values
    const newFromVerse = fromVerse !== undefined
        ? fromVerse
        : memorization.fromVerse

    const newToVerse = toVerse !== undefined
        ? toVerse
        : memorization.toVerse

    // Validate verses
    if (typeof newFromVerse !== 'number' || newFromVerse <= 0) {
        throw new Error('from verse must be a positive number')
    }

    if (typeof newToVerse !== 'number' || newToVerse <= 0) {
        throw new Error('to verse must be a positive number')
    }

    if (newFromVerse > newToVerse) {
        throw new Error('to verse must be greater than from verse')
    }

    // Validate surah if provided
    if (surah !== undefined && !surah) {
        throw new Error('surah is required')
    }

    // Validate date if provided
    let newDate = memorization.date

    if (date !== undefined) {
        newDate = new Date(date)

        if (isNaN(newDate.getTime())) {
            throw new Error('invalid date')
        }

        newDate.setHours(0, 0, 0, 0)
    }

    // Update
    memorization.surah = surah !== undefined
        ? surah
        : memorization.surah

    memorization.fromVerse = newFromVerse
    memorization.toVerse = newToVerse
    memorization.date = newDate

    await memorization.save()

    return memorization
}


const deleteMemorization = async (memorizationId, user)=>{
    const memorization = await Memorization.findById(memorizationId)
    if(!memorization){
        throw new Error('memorization not found')
    }
    const halaqa = await Halaqa.findById(memorization.halaqa)
    if(!halaqa){
        throw new Error('halaqa not found')
    }

    if(user.role ==='teacher'){
        if(halaqa.teacher.toString() !== user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }
    }

    if(user.role !== 'admin' && user.role !== 'teacher'){
        throw new Error('unauthorized')
    }
    await memorization.deleteOne()
    return {message:'memorization successfully deleted'}

}



module.exports = {
    createMemorization,
    getMemorization,
    getMemorizationById,
    updateMemorization,
    deleteMemorization
}
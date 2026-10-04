const Evaluation = require('../models/evaluationModel')
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const notificationService = require('./notificationService')


const createEvaluation = async (evaluationData,user)=>{
    const {student, halaqa, type, score, notes, date} = evaluationData
    const studentData = await User.findById(student)
    if(!studentData){
        throw new Error('student not found')
    }
    if(studentData.role !== 'student'){
        throw new Error(' user is not a student')
    }
    const halaqaData = await Halaqa.findById(halaqa)
    if(!halaqaData){
        throw new Error('halaqa not found')
    }
    const isStudentExist = halaqaData.students.some(id=> id.toString() === studentData._id.toString())
    if(!isStudentExist){
        throw new Error('student is not from this halaqa')
    }

    if(user.role === 'teacher'){
        if(halaqaData.teacher.toString() !== user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }
    }
    
    if(user.role !== 'admin' && user.role !== 'teacher'){
        throw new Error('unauthorized')
    }
    const allowedTypes = ['memorization', 'recitation', 'tajweed']
    if(!type){
        throw new Error('type are required')
    }
    if(!allowedTypes.includes(type)){
        throw new Error('type are not allowed')
    }
    if (typeof score !== 'number' || score <0 || score > 10){
        throw new Error('score must be from 0 to 10')
    }
    if(!date){
        throw new Error('date are required')
    }
    const evaluationDate = new Date(date)

    if(isNaN(evaluationDate.getTime())){
        throw new Error('invalid date')
    }

    evaluationDate.setHours(0, 0, 0, 0)

    const evaluation = await Evaluation.create({
        student,
        halaqa,
        teacher:user._id,
        type,
        score,
        notes,
        date:evaluationDate
    })
    await notificationService.createNotification({
            recipient: student,
            title: 'New Evaluation',
            message: `You received a new ${type} evaluation with score ${score}/10`,
            type: 'evaluation'
    })

    return evaluation

}

const getEvaluation = async (user)=>{
    if(user.role === 'admin'){
        return await Evaluation.find()
        .populate('student', 'name email')
        .populate('halaqa', 'name teacher')
        .populate('teacher', 'name email')
    }

    if(user.role === 'teacher'){
        const halaqas = await Halaqa.find({teacher: user._id}).select('_id')
        const halaqaIds = halaqas.map( halaqa => halaqa._id)

        const evaluation = await Evaluation.find({halaqa: { $in: halaqaIds }})
                                            .populate('student', 'name email')
                                            .populate('halaqa', 'name teacher')
                                            .populate('teacher', 'name email')


        return evaluation
    }

    if(user.role === 'student'){
        return await Evaluation.find({ student: user._id })
            .populate('student', 'name email')
            .populate('halaqa', 'name teacher')
            .populate('teacher', 'name email')
            .sort({ date: -1 })
    }

    throw new Error('Unauthorized')

}

const getEvaluationById = async (evaluationId, user)=>{
    const evaluation = await Evaluation.findById(evaluationId)
                            .populate('student', 'name email')
                            .populate('halaqa', 'name teacher')
                            .populate('teacher', 'name email')
    if(!evaluation){
        throw new Error('evaluation not found')
    }
    if(user.role === 'admin'){
        return evaluation
    }
    if(user.role === 'teacher'){
        const halaqa = await Halaqa.findById(evaluation.halaqa)

        if(!halaqa){
            throw new Error('halaqa not found')
        }
        if(halaqa.teacher.toString() === user._id.toString()){
            return evaluation
        }
    }
    if(user.role === 'student'){
        const studentId = evaluation.student && evaluation.student._id ? evaluation.student._id.toString() : evaluation.student.toString()
        if(studentId === user._id.toString()){
            return evaluation
        }
    }
    throw new Error('Unauthorized')
    
}

const updateEvaluation = async (evaluationData,evaluationId, user)=>{

    const {type, score, notes, date} = evaluationData

    const evaluation = await Evaluation.findById(evaluationId)
    if(!evaluation){
        throw new Error('evaluation not found')
    }
    const halaqa = await Halaqa.findById(evaluation.halaqa)
    if(!halaqa){
        throw new Error('halaqa not found')
    }
    if(user.role === 'teacher'){
        if(halaqa.teacher.toString() !== user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }

    }
    if(user.role !== 'teacher' && user.role !== 'admin' ){
        throw new Error('unauthorized')
    }

    const newType = type !== undefined ? type : evaluation.type
    const newScore = score !== undefined ? score : evaluation.score
    
    const allowedTypes = ['memorization', 'recitation', 'tajweed']

    if(!newType || !allowedTypes.includes(newType)){
        throw new Error('invalid type')
    }
    if(typeof newScore !== 'number' || newScore < 0 || newScore > 10 ){
        throw new Error('invalid score')
    }

    let newDate =  evaluation.date

    if(date !== undefined){
        newDate = new Date(date)
        if (isNaN(newDate.getTime())) {
            throw new Error('invalid date')
        }

        newDate.setHours(0, 0, 0, 0)
    }
    const newNotes = notes !== undefined ? notes : evaluation.notes
    evaluation.type = newType
    evaluation.score = newScore
    evaluation.notes = newNotes
    evaluation.date = newDate

    await evaluation.save()

    return evaluation

}

const deleteEvaluation = async (evaluationId, user)=>{
    const evaluation = await Evaluation.findById(evaluationId)
    if(!evaluation){
        throw new Error('evaluation not found')
    }

    const halaqa = await Halaqa.findById(evaluation.halaqa)

    if(!halaqa){
        throw new Error('halaqa not foud')
    }

    if(user.role === 'teacher'){
        if(halaqa.teacher.toString()!== user._id.toString()){
            throw new Error('you are not teacher of this halaqa')
        }
    }
    if(user.role !== 'teacher' && user.role !== 'admin'){
        throw new Error('unauthorized')
    }
    await evaluation.deleteOne()
    return 'evaluation successfully deleted'
}

module.exports = {
    createEvaluation,
    getEvaluation,
    getEvaluationById,
    updateEvaluation,
    deleteEvaluation
}
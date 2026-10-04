const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')

const createHalaqa = async (halaqaData)=>{
    const {name, teacher, schedule} = halaqaData

    if(!name || !teacher){
        throw new Error('name and teacher are required')
    }
    const teacherUser = await User.findById(teacher)

    if(!teacherUser){
        throw new Error('teacher not found')
    }

    if(teacherUser.role !== 'teacher'){
        throw new Error('user is not a teacher')
    }

    const halaqa = await Halaqa.create({
        name,
        teacher,
        schedule
    })

    return halaqa


}

const getHalaqas = async ()=>{
    const halaqas = await Halaqa.find().populate('teacher', 'name email role isActive').populate('students', 'name email role isActive')

    return halaqas 
}

const getHalaqaById = async (halaqaId)=>{

    const halaqa = await Halaqa.findById(halaqaId).populate('teacher', 'name email role isActive').populate('students', 'name email role isActive')

    return halaqa
}

const addStudentToHalqa = async (halqaId, studentId)=>{

    const halaqa = await Halaqa.findById(halqaId)
    const student = await User.findById(studentId)
    if(!halaqa){
        throw new Error('halaqa not found')
    }
    if(!student){
        throw new Error('Student not found')
    }
    if(student.role !== 'student'){
        throw Error('user must be student')
    }

    const isStudentExist = halaqa.students.some(id => id.toString() === student._id.toString())
    if(isStudentExist){
        throw new Error('student is already exist')
    }
    halaqa.students.push(student._id)
    await halaqa.save()

    return halaqa
}


const removeStudentFromHalaqa = async (halqaId, studentId)=>{

    const halaqa = await Halaqa.findById(halqaId)
    
    if(!halaqa){
        throw new Error('halaqa not found')
    }


    const isStudentExist  = halaqa.students.some(id => id.toString() === studentId.toString())
    if(!isStudentExist){
        throw new Error('student is not in this halaqa')
    }
    halaqa.students = halaqa.students.filter(id => id.toString() !== studentId.toString())
    
    await halaqa.save()

    return halaqa
}


const updateHalaqa = async (halaqaId, halaqaData)=>{
    const halaqa = await Halaqa.findById(halaqaId)
    
    if(!halaqa){
        throw new Error('halaqa not found')
    }
    const { name, teacher, schedule } = halaqaData
   

    if(name !== undefined){
        halaqa.name = name
    }
    if(schedule !== undefined){
        halaqa.schedule = schedule
    }

    if(teacher !== undefined){
        const teacherUser = await User.findById(teacher)
        if(!teacherUser){
            throw new Error('teacher not found')
        }
        if(teacherUser.role !== 'teacher'){
            throw new Error('user is not a teacher')
        }
        
        halaqa.teacher = teacher
    }
    

    await halaqa.save()


    
    return halaqa
}


const updateHalaqaStatus = async (halaqaId, isActive)=>{

    const halaqa = await Halaqa.findById(halaqaId)
    if(!halaqa){
        throw Error('halaqa not found')
    }
    if(typeof isActive !== 'boolean'){
        throw Error('action data type must be a boolean')
    }
    halaqa.isActive = isActive

    await halaqa.save()

    return halaqa
}




module.exports = {
    createHalaqa,
    getHalaqas,
    getHalaqaById,
    addStudentToHalqa,
    removeStudentFromHalaqa,
    updateHalaqa,
    updateHalaqaStatus

}   
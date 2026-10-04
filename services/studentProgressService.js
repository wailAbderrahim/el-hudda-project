const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Attendance = require('../models/attendanceModel')
const Memorization = require('../models/memorizatonModel')
const Evaluation = require('../models/evaluationModel')


const getStudentProgress = async(studentId, user)=>{
    const student = await User.findById(studentId)
    if(!student){
        throw new Error('student not found')
    }
    if(student.role !== 'student'){
        throw new Error('user is not a student')
    }
    const halaqa = await Halaqa.findOne({ students: studentId })

    if (user.role === 'teacher') {

        if (!halaqa) {
            throw new Error('student is not assigned to any halaqa')
        }

        if (halaqa.teacher.toString() !== user._id.toString()) {
            throw new Error('you are not teacher of this halaqa')
        }
    }

    if (user.role === 'student') {
        if (studentId.toString() !== user._id.toString()) {
            throw new Error('Unauthorized: cannot view other students progress')
        }
    }


    const attendances = await Attendance.find({student:studentId})

    const total = attendances.length
    const present = attendances.filter(attendance => attendance.status === 'present').length
    const absent = attendances.filter(attendance => attendance.status === 'absent').length
    const late = attendances.filter(attendance => attendance.status === 'late').length



    const attendanceRate = total === 0 ? 0 : Number(((present / total) * 100).toFixed(2))


    const memorization = await Memorization.find({student:studentId}).sort({ date: -1 })

    const totalMemorization = memorization.length

    const lastMemorization = memorization.length > 0 ? memorization[0] : null

    const evaluations = await Evaluation.find({student:studentId}).sort({ date: -1 })

    const totalEvaluations = evaluations.length

    const totalEvaluationScor = evaluations.reduce((sum, evaluation) =>{
        return sum + evaluation.score
    },0)

    const averageScore = totalEvaluations === 0
    ? 0
    : totalEvaluationScor / totalEvaluations


    const lastEvaluation = evaluations.length > 0 ? evaluations[0] : null

    return {
        student,
        halaqa,
        attendance: {
            total,
            present,
            absent,
            late,
            attendanceRate
        },
        memorization: {
            total: totalMemorization,
            last: lastMemorization
        },
        evaluations: {
            total: totalEvaluations,
            averageScore,
            last: lastEvaluation
        }
    }




}



module.exports = {getStudentProgress}
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Attendance = require('../models/attendanceModel')
const Memorization = require('../models/memorizatonModel')
const Evaluation = require('../models/evaluationModel')


const getStudentsReport = async (studentId, user)=>{
    const student = await User.findById(studentId)
    if(!student){
        throw new Error('student not found')
    }
    const halaqa = await Halaqa.findOne({students:studentId})
        .populate('teacher', 'name email')
    if(!halaqa){
        throw new Error('halaqa not found')
    }
    const attendances = await Attendance.find({student:studentId})
    const memorizations = await Memorization.find({student:studentId})
    const evaluations = await Evaluation.find({student:studentId})
    if( user.role !== 'admin' && user.role !== 'teacher' ){
        throw new Error('unauthorized')
    }
    if(user.role == 'teacher'){
            if(halaqa.teacher._id.toString() !== user._id.toString()){
                throw new Error('you are not the teacher of this student')
        }

    }
    const totalAttnedndances = attendances.length
    const present = attendances.filter(attendance => attendance.status === 'present').length
    const absent = attendances.filter(attendance => attendance.status === 'absent').length
    const late = attendances.filter(attendance => attendance.status === 'late').length
    const attendanceRate = totalAttnedndances !== 0?  present / totalAttnedndances * 100 : 0

    const totalMemorizations = memorizations.length
    memorizations.sort((a, b) => b.createdAt - a.createdAt)
    const lastMemorization = memorizations.length > 0 ? memorizations[0] : null


    const totalEvaluations = evaluations.length

    const totalScore = evaluations.reduce(
    (sum, evaluation) => sum + evaluation.score,
    0
    )
    const averageScore =
    totalEvaluations !== 0
        ? totalScore / totalEvaluations
        : 0
    evaluations.sort((a, b) => b.createdAt - a.createdAt)
    const lastEvaluation = evaluations.length > 0 ? evaluations[0] : null

    return {
        student: {
            id: student._id,
            name: student.name,
            email: student.email
        },

        halaqa: {
            id: halaqa._id,
            name: halaqa.name,
            teacher: halaqa.teacher
        },

        attendance: {
            total: totalAttnedndances,
            present,
            absent,
            late,
            attendanceRate
        },

        memorization: {
            total: totalMemorizations,
            last: lastMemorization
        },

        evaluations: {
            total: totalEvaluations,
            averageScore,
            last: lastEvaluation
        }
    }
    
}
const getHalaqaReport = async (halaqaId, user) => {

    const halaqa = await Halaqa.findById(halaqaId)
        .populate('teacher', 'name email')

    if (!halaqa) {
        throw new Error('halaqa not found')
    }

    if (user.role !== 'admin' && user.role !== 'teacher') {
        throw new Error('unauthorized')
    }

    if (user.role === 'teacher') {
        if (halaqa.teacher._id.toString() !== user._id.toString()) {
            throw new Error('you are not the teacher of this halaqa')
        }
    }

    const studentIds = halaqa.students

    const studentsCount = studentIds.length

    const attendances = await Attendance.find({
        halaqa: halaqaId
    })

    const memorizations = await Memorization.find({
        halaqa: halaqaId
    })

    const evaluations = await Evaluation.find({
        halaqa: halaqaId
    })

    const totalAttendances = attendances.length

    const present = attendances.filter(
        attendance => attendance.status === 'present'
    ).length

    const absent = attendances.filter(
        attendance => attendance.status === 'absent'
    ).length

    const late = attendances.filter(
        attendance => attendance.status === 'late'
    ).length

    const attendanceRate =
        totalAttendances !== 0
            ? present / totalAttendances * 100
            : 0

    const totalMemorizations = memorizations.length

    const totalEvaluations = evaluations.length

    const totalScore = evaluations.reduce(
        (sum, evaluation) => sum + evaluation.score,
        0
    )

    const averageScore =
        totalEvaluations !== 0
            ? totalScore / totalEvaluations
            : 0

    return {
        halaqa: {
            id: halaqa._id,
            name: halaqa.name,
            teacher: halaqa.teacher
        },

        studentsCount,

        attendance: {
            total: totalAttendances,
            present,
            absent,
            late,
            attendanceRate
        },

        memorization: {
            total: totalMemorizations
        },

        evaluations: {
            total: totalEvaluations,
            averageScore
        }
    }
}


module.exports = {
    getStudentsReport,
    getHalaqaReport

}
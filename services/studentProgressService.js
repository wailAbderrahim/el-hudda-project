const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Attendance = require('../models/attendanceModel')
const Memorization = require('../models/memorizatonModel')
const Evaluation = require('../models/evaluationModel')
const StudentMatnProgress = require('../models/studentMatnProgressModel')
const ExamAttempt = require('../models/examAttemptModel')
const StudentLevelHistory = require('../models/studentLevelHistoryModel')
const Level = require('../models/levelModel')

const getStudentProgress = async (studentId, user) => {
    const student = await User.findById(studentId)
        .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires')
        .populate('currentLevel', 'name order passingScore requirements nextLevel')

    if (!student) {
        const err = new Error('student not found')
        err.statusCode = 404
        throw err
    }
    if (student.role !== 'student') {
        const err = new Error('user is not a student')
        err.statusCode = 400
        throw err
    }

    // Populate teacher so teacher name is always available instead of raw ObjectId
    const halaqa = await Halaqa.findOne({ students: studentId })
        .populate('teacher', 'name firstName lastName email phone')

    if (user.role === 'teacher') {
        if (!halaqa) {
            const err = new Error('student is not assigned to any halaqa')
            err.statusCode = 404
            throw err
        }

        const teacherId = halaqa.teacher && halaqa.teacher._id
            ? halaqa.teacher._id.toString()
            : halaqa.teacher.toString()

        if (teacherId !== user._id.toString()) {
            const err = new Error('you are not teacher of this halaqa')
            err.statusCode = 403
            throw err
        }
    }

    if (user.role === 'student') {
        if (studentId.toString() !== user._id.toString()) {
            const err = new Error('Unauthorized: cannot view other students progress')
            err.statusCode = 403
            throw err
        }
    }

    // Attendance
    const attendances = await Attendance.find({ student: studentId })
    const totalAtt = attendances.length
    const present = attendances.filter(a => a.status === 'present').length
    const absent = attendances.filter(a => a.status === 'absent').length
    const late = attendances.filter(a => a.status === 'late').length
    const attendanceRate = totalAtt === 0 ? 0 : Number(((present / totalAtt) * 100).toFixed(2))

    // Quran Memorization
    const memorization = await Memorization.find({ student: studentId }).sort({ date: -1 })
    const totalMemorization = memorization.length
    const lastMemorization = memorization.length > 0 ? memorization[0] : null

    // Daily Evaluations
    const evaluations = await Evaluation.find({ student: studentId }).sort({ date: -1 })
    const totalEvaluations = evaluations.length
    const totalEvaluationScore = evaluations.reduce((sum, e) => sum + (e.score || 0), 0)
    const averageScore = totalEvaluations === 0 ? 0 : Number((totalEvaluationScore / totalEvaluations).toFixed(2))
    const lastEvaluation = evaluations.length > 0 ? evaluations[0] : null

    // Matn Progress
    const matnProgressRecords = await StudentMatnProgress.find({ student: studentId })
        .sort({ recitationDate: -1 })
        .populate('matn', 'name level chapters')
        .populate('teacher', 'name')
    const masteredMatnsCount = matnProgressRecords.filter(m => m.status === 'mastered').length
    const inProgressMatnsCount = matnProgressRecords.filter(m => m.status === 'in_progress').length

    // Exam Results
    const examAttempts = await ExamAttempt.find({
        student: studentId,
        status: { $in: ['approved', 'published'] }
    })
        .sort({ submittedAt: -1 })
        .populate('exam', 'title type format totalScore passingScore')
    const passedExamsCount = examAttempts.filter(e => e.isPassed).length

    // Level Transition History
    const levelHistory = await StudentLevelHistory.find({ student: studentId })
        .sort({ changeDate: -1 })
        .populate('previousLevel', 'name order')
        .populate('newLevel', 'name order')
        .populate('changedBy', 'name role')

    return {
        student,
        halaqa,
        attendance: {
            total: totalAtt,
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
        },
        matn: {
            total: matnProgressRecords.length,
            masteredCount: masteredMatnsCount,
            inProgressCount: inProgressMatnsCount,
            records: matnProgressRecords
        },
        exams: {
            total: examAttempts.length,
            passedCount: passedExamsCount,
            attempts: examAttempts
        },
        levelHistory
    }
}

module.exports = { getStudentProgress }
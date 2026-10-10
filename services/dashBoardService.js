const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Memorization = require('../models/memorizatonModel')
const Evaluation = require('../models/evaluationModel')
const Attendance = require('../models/attendanceModel')
const Level = require('../models/levelModel')
const Matn = require('../models/matnModel')
const StudentMatnProgress = require('../models/studentMatnProgressModel')
const Exam = require('../models/examModel')
const ExamAttempt = require('../models/examAttemptModel')
const StudentLevelHistory = require('../models/studentLevelHistoryModel')

const getDashboardStats = async (user) => {
    // 1. Admin Dashboard Stats
    if (!user || user.role === 'admin') {
        const students = await User.countDocuments({ role: 'student' })
        const teachers = await User.countDocuments({ role: 'teacher' })
        const halaqas = await Halaqa.countDocuments()
        const memorizations = await Memorization.countDocuments()
        const evaluations = await Evaluation.countDocuments()

        const attendancesTotal = await Attendance.countDocuments()
        const presents = await Attendance.countDocuments({ status: 'present' })
        const attendanceRate = attendancesTotal !== 0 ? Math.round((presents / attendancesTotal) * 100) : 0

        // Educational Levels stats
        const levelsCount = await Level.countDocuments()
        const levels = await Level.find().sort({ order: 1 })
        const studentsPerLevel = await Promise.all(levels.map(async (lvl) => {
            const count = await User.countDocuments({ currentLevel: lvl._id, role: 'student' })
            return {
                _id: lvl._id,
                name: lvl.name,
                order: lvl.order,
                count
            }
        }))
        const unassignedLevelCount = await User.countDocuments({ role: 'student', currentLevel: null })
        if (unassignedLevelCount > 0) {
            studentsPerLevel.push({
                _id: null,
                name: 'غير محدد',
                order: 999,
                count: unassignedLevelCount
            })
        }

        // Matn stats
        const activeMatnsCount = await Matn.countDocuments({ isActive: true })
        const matnProgressCount = await StudentMatnProgress.countDocuments()

        // Exam stats
        const now = new Date()
        const upcomingExamsCount = await Exam.countDocuments({
            status: 'active',
            $or: [{ startDate: { $gt: now } }, { startDate: null }]
        })
        const pendingGradingExamsCount = await ExamAttempt.countDocuments({ status: 'grading' })
        const pendingApprovalResultsCount = await ExamAttempt.countDocuments({ status: 'approved' })
        const levelTransitionsCount = await StudentLevelHistory.countDocuments()

        return {
            students,
            teachers,
            halaqas,
            memorizations,
            evaluations,
            attendanceRate,
            // Enhanced indicators
            levelsCount,
            studentsPerLevel,
            activeMatnsCount,
            matnProgressCount,
            upcomingExamsCount,
            pendingGradingExamsCount,
            pendingApprovalResultsCount,
            levelTransitionsCount
        }
    }

    // 2. Teacher Dashboard Stats
    if (user.role === 'teacher') {
        const teacherHalaqas = await Halaqa.find({ teacher: user._id })
        const halaqaIds = teacherHalaqas.map(h => h._id)
        const studentIds = teacherHalaqas.flatMap(h => h.students.map(s => s.toString()))

        const myHalaqasCount = teacherHalaqas.length
        const myStudentsCount = studentIds.length

        // Attendance stats for teacher's halaqas
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const todayAttendances = await Attendance.find({
            halaqa: { $in: halaqaIds },
            date: { $gte: todayStart, $lte: todayEnd }
        })
        const todayPresent = todayAttendances.filter(a => a.status === 'present').length
        const todayAttRate = todayAttendances.length > 0 ? Math.round((todayPresent / todayAttendances.length) * 100) : 0

        // Quran memorizations
        const quranMemorizationCount = await Memorization.countDocuments({ halaqa: { $in: halaqaIds } })

        // Matn progress for teacher's students
        const matnProgressCount = await StudentMatnProgress.countDocuments({ student: { $in: studentIds } })

        // Exams related to teacher
        const myExamsCount = await Exam.countDocuments({
            $or: [{ teacher: user._id }, { targetHalaqa: { $in: halaqaIds } }]
        })
        const teacherExams = await Exam.find({ teacher: user._id }).select('_id')
        const teacherExamIds = teacherExams.map(e => e._id)
        const pendingGradingCount = await ExamAttempt.countDocuments({
            exam: { $in: teacherExamIds },
            status: 'grading'
        })
        const pendingApprovalCount = await ExamAttempt.countDocuments({
            exam: { $in: teacherExamIds },
            status: 'approved'
        })

        // Students needing revision / evaluation
        const studentsNeedingReviewCount = await StudentMatnProgress.countDocuments({
            student: { $in: studentIds },
            status: 'needs_revision'
        })

        return {
            myHalaqasCount,
            myStudentsCount,
            todayAttRate,
            quranMemorizationCount,
            matnProgressCount,
            myExamsCount,
            pendingGradingCount,
            pendingApprovalCount,
            studentsNeedingReviewCount
        }
    }

    return {}
}

module.exports = { getDashboardStats }
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Memorization = require('../models/memorizatonModel')
const Evaluation = require('../models/evaluationModel')
const Attendance = require('../models/attendanceModel')

const getDashboardStats = async () => {

    const students = await User.countDocuments({role:'student'})
    const teachers = await User.countDocuments({role:'teacher'})
    const halaqas = await Halaqa.countDocuments()
    const memorizations = await Memorization.countDocuments()
    const evaluations = await Evaluation.countDocuments()

    const atendancesTotal = await Attendance.countDocuments()
    const presents = await Attendance.countDocuments({status:'present'})
    const attendanceRate = atendancesTotal !== 0 ? presents / atendancesTotal * 100 :  0

    return {
    students,
    teachers,
    halaqas,
    memorizations,
    evaluations,
    attendanceRate
    }

}

module.exports = {getDashboardStats}
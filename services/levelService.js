const Level = require('../models/levelModel')
const StudentLevelHistory = require('../models/studentLevelHistoryModel')
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')

const getLevels = async (user) => {
    const filter = (user && user.role === 'admin') ? {} : { isActive: true }
    return await Level.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .populate('nextLevel', 'name order')
}

const getLevelById = async (levelId) => {
    const level = await Level.findById(levelId).populate('nextLevel', 'name order')
    if (!level) {
        const err = new Error('المستوى التعليمي غير موجود')
        err.statusCode = 404
        throw err
    }
    const studentsCount = await User.countDocuments({ currentLevel: levelId, role: 'student' })
    return {
        ...level.toObject(),
        studentsCount
    }
}

const createLevel = async (levelData, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بإنشاء مستويات')
        err.statusCode = 403
        throw err
    }

    const { name, description, order, passingScore, requiredExamsCount, requirements, nextLevel, autoPromoteOnPass } = levelData

    if (!name || !name.trim()) {
        const err = new Error('اسم المستوى مطلوب')
        err.statusCode = 400
        throw err
    }

    const level = await Level.create({
        name: name.trim(),
        description: (description || '').trim(),
        order: typeof order === 'number' ? order : 1,
        passingScore: typeof passingScore === 'number' ? passingScore : 60,
        requiredExamsCount: typeof requiredExamsCount === 'number' ? requiredExamsCount : 1,
        requirements: (requirements || '').trim(),
        nextLevel: nextLevel || null,
        autoPromoteOnPass: Boolean(autoPromoteOnPass),
        isActive: true
    })

    return level
}

const updateLevel = async (levelId, levelData, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بتعديل المستويات')
        err.statusCode = 403
        throw err
    }

    const level = await Level.findById(levelId)
    if (!level) {
        const err = new Error('المستوى غير موجود')
        err.statusCode = 404
        throw err
    }

    const { name, description, order, passingScore, requiredExamsCount, requirements, nextLevel, autoPromoteOnPass, isActive } = levelData

    if (name !== undefined) level.name = name.trim()
    if (description !== undefined) level.description = description.trim()
    if (order !== undefined) level.order = Number(order)
    if (passingScore !== undefined) level.passingScore = Number(passingScore)
    if (requiredExamsCount !== undefined) level.requiredExamsCount = Number(requiredExamsCount)
    if (requirements !== undefined) level.requirements = requirements.trim()
    if (nextLevel !== undefined) level.nextLevel = nextLevel || null
    if (autoPromoteOnPass !== undefined) level.autoPromoteOnPass = Boolean(autoPromoteOnPass)
    if (isActive !== undefined) level.isActive = Boolean(isActive)

    await level.save()
    return level
}

const deleteLevel = async (levelId, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بحذف المستويات')
        err.statusCode = 403
        throw err
    }

    const studentsCount = await User.countDocuments({ currentLevel: levelId, role: 'student' })
    if (studentsCount > 0) {
        const err = new Error(`لا يمكن حذف هذا المستوى لوجود ${studentsCount} طالب مسجل به حالياً. يمكنك تعطيله بدلاً من حذفه.`)
        err.statusCode = 400
        throw err
    }

    const level = await Level.findByIdAndDelete(levelId)
    if (!level) {
        const err = new Error('المستوى غير موجود')
        err.statusCode = 404
        throw err
    }

    return { message: 'تم حذف المستوى بنجاح' }
}

const getStudentsByLevel = async (levelId, user) => {
    if (user.role === 'student') {
        const err = new Error('غير مصرح')
        err.statusCode = 403
        throw err
    }

    let filter = { currentLevel: levelId, role: 'student' }

    if (user.role === 'teacher') {
        const teacherHalaqas = await Halaqa.find({ teacher: user._id })
        const studentIds = teacherHalaqas.flatMap(h => h.students.map(s => s.toString()))
        filter._id = { $in: studentIds }
    }

    return await User.find(filter)
        .select('name firstName lastName email phone currentLevel dateOfBirth placeOfBirth municipalityOfBirth')
        .populate('currentLevel', 'name order')
}

const assignStudentLevel = async ({ studentId, newLevelId, reason, notes, examId }, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بتعيين المستوى')
        err.statusCode = 403
        throw err
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'student') {
        const err = new Error('الطالب غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role === 'teacher') {
        const halaqa = await Halaqa.findOne({ teacher: user._id, students: studentId })
        if (!halaqa) {
            const err = new Error('لا يمكنك تغيير مستوى طالب ليس من حلقتك')
            err.statusCode = 403
            throw err
        }
    }

    const newLevel = await Level.findById(newLevelId)
    if (!newLevel) {
        const err = new Error('المستوى المستهدف غير موجود')
        err.statusCode = 404
        throw err
    }

    const previousLevel = student.currentLevel || null

    student.currentLevel = newLevelId
    await student.save()

    const history = await StudentLevelHistory.create({
        student: studentId,
        previousLevel,
        newLevel: newLevelId,
        changedBy: user._id,
        changeDate: new Date(),
        reason: (reason || '').trim(),
        notes: (notes || '').trim(),
        exam: examId || null
    })

    const populatedHistory = await StudentLevelHistory.findById(history._id)
        .populate('previousLevel', 'name order')
        .populate('newLevel', 'name order')
        .populate('changedBy', 'name role')
        .populate('exam', 'title')

    return {
        student: {
            _id: student._id,
            name: student.name,
            currentLevel: newLevel
        },
        history: populatedHistory
    }
}

const getStudentLevelHistory = async (studentId, user) => {
    let query = {}

    if (studentId && studentId !== 'all') {
        if (user.role === 'student' && user._id.toString() !== studentId.toString()) {
            const err = new Error('غير مصرح لك بالاطلاع على سجل طلاب آخرين')
            err.statusCode = 403
            throw err
        }

        if (user.role === 'teacher') {
            const halaqa = await Halaqa.findOne({ teacher: user._id, students: studentId })
            if (!halaqa) {
                const err = new Error('الطالب ليس مسجلاً في حلقتك')
                err.statusCode = 403
                throw err
            }
        }

        query.student = studentId
    } else {
        if (user.role === 'student') {
            query.student = user._id
        } else if (user.role === 'teacher') {
            const teacherHalaqas = await Halaqa.find({ teacher: user._id })
            const studentIds = teacherHalaqas.flatMap(h => h.students.map(s => s.toString()))
            query.student = { $in: studentIds }
        }
    }

    return await StudentLevelHistory.find(query)
        .sort({ changeDate: -1 })
        .populate('student', 'name email firstName lastName')
        .populate('previousLevel', 'name order')
        .populate('newLevel', 'name order')
        .populate('changedBy', 'name role')
        .populate('exam', 'title type')
}

module.exports = {
    getLevels,
    getLevelById,
    createLevel,
    updateLevel,
    deleteLevel,
    getStudentsByLevel,
    assignStudentLevel,
    getStudentLevelHistory
}

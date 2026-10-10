const Matn = require('../models/matnModel')
const StudentMatnProgress = require('../models/studentMatnProgressModel')
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')

const getMatns = async (user) => {
    const filter = (user && user.role === 'admin') ? {} : { isActive: true }
    return await Matn.find(filter)
        .sort({ name: 1 })
        .populate('level', 'name order')
}

const getMatnById = async (matnId) => {
    const matn = await Matn.findById(matnId).populate('level', 'name order')
    if (!matn) {
        const err = new Error('المتن غير موجود')
        err.statusCode = 404
        throw err
    }
    return matn
}

const createMatn = async (matnData, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بإضافة متون')
        err.statusCode = 403
        throw err
    }

    const { name, description, level, chapters, totalSections } = matnData
    if (!name || !name.trim()) {
        const err = new Error('اسم المتن مطلوب')
        err.statusCode = 400
        throw err
    }

    const normalizedChapters = Array.isArray(chapters) ? chapters.map((c, i) => ({
        title: (c.title || `الباب ${i + 1}`).trim(),
        order: typeof c.order === 'number' ? c.order : i + 1,
        versesCount: typeof c.versesCount === 'number' ? c.versesCount : 0,
        description: (c.description || '').trim()
    })) : []

    const matn = await Matn.create({
        name: name.trim(),
        description: (description || '').trim(),
        level: level || null,
        chapters: normalizedChapters,
        totalSections: normalizedChapters.length || (totalSections || 1),
        isActive: true
    })

    return matn
}

const updateMatn = async (matnId, matnData, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بتعديل المتون')
        err.statusCode = 403
        throw err
    }

    const matn = await Matn.findById(matnId)
    if (!matn) {
        const err = new Error('المتن غير موجود')
        err.statusCode = 404
        throw err
    }

    const { name, description, level, chapters, totalSections, isActive } = matnData

    if (name !== undefined) matn.name = name.trim()
    if (description !== undefined) matn.description = description.trim()
    if (level !== undefined) matn.level = level || null
    if (Array.isArray(chapters)) {
        matn.chapters = chapters.map((c, i) => ({
            title: (c.title || `الباب ${i + 1}`).trim(),
            order: typeof c.order === 'number' ? c.order : i + 1,
            versesCount: typeof c.versesCount === 'number' ? c.versesCount : 0,
            description: (c.description || '').trim()
        }))
        matn.totalSections = matn.chapters.length
    } else if (totalSections !== undefined) {
        matn.totalSections = Number(totalSections)
    }
    if (isActive !== undefined) matn.isActive = Boolean(isActive)

    await matn.save()
    return matn
}

const deleteMatn = async (matnId, user) => {
    if (user.role !== 'admin') {
        const err = new Error('غير مصرح لك بحذف المتن')
        err.statusCode = 403
        throw err
    }

    const progressCount = await StudentMatnProgress.countDocuments({ matn: matnId })
    if (progressCount > 0) {
        const err = new Error(`لا يمكن حذف المتن لوجود ${progressCount} سجل متابعة حفظ مرتبط به. يمكنك تعطيله بدلاً من حذفه.`)
        err.statusCode = 400
        throw err
    }

    const matn = await Matn.findByIdAndDelete(matnId)
    if (!matn) {
        const err = new Error('المتن غير موجود')
        err.statusCode = 404
        throw err
    }

    return { message: 'تم حذف المتن بنجاح' }
}

const getMatnProgress = async (user) => {
    let filter = {}

    if (user.role === 'student') {
        filter = { student: user._id }
    } else if (user.role === 'teacher') {
        const teacherHalaqas = await Halaqa.find({ teacher: user._id })
        const studentIds = teacherHalaqas.flatMap(h => h.students.map(s => s.toString()))
        filter = { student: { $in: studentIds } }
    }

    return await StudentMatnProgress.find(filter)
        .sort({ recitationDate: -1, createdAt: -1 })
        .populate('student', 'name firstName lastName email currentLevel')
        .populate('matn', 'name level chapters')
        .populate('teacher', 'name firstName lastName email')
        .populate('halaqa', 'name')
}

const getStudentMatnProgressByStudentId = async (studentId, user) => {
    if (user.role === 'student' && user._id.toString() !== studentId.toString()) {
        const err = new Error('غير مصرح لك بعرض بيانات طالب آخر')
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

    return await StudentMatnProgress.find({ student: studentId })
        .sort({ recitationDate: -1, createdAt: -1 })
        .populate('matn', 'name level chapters')
        .populate('teacher', 'name firstName lastName email')
        .populate('halaqa', 'name')
}

const createStudentMatnProgress = async (progressData, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بتسجيل حفظ المتون')
        err.statusCode = 403
        throw err
    }

    const { studentId, matnId, section, chapterIndex, progressPercentage, status, revisionStatus, masteryGrade, recitationDate, notes } = progressData

    if (!studentId || !matnId || !section) {
        const err = new Error('بيانات الطالب والمتن والمقطع مطلوبة')
        err.statusCode = 400
        throw err
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'student') {
        const err = new Error('الطالب غير موجود')
        err.statusCode = 404
        throw err
    }

    let halaqaId = null
    const halaqa = await Halaqa.findOne({ students: studentId })
    if (halaqa) {
        halaqaId = halaqa._id
    }

    if (user.role === 'teacher') {
        if (!halaqa || halaqa.teacher.toString() !== user._id.toString()) {
            const err = new Error('لا يمكنك تسجيل حفظ لطالب خارج حلقتك')
            err.statusCode = 403
            throw err
        }
    }

    const matn = await Matn.findById(matnId)
    if (!matn) {
        const err = new Error('المتن غير موجود')
        err.statusCode = 404
        throw err
    }

    const progress = await StudentMatnProgress.create({
        student: studentId,
        matn: matnId,
        halaqa: halaqaId,
        teacher: user._id,
        section: section.trim(),
        chapterIndex: typeof chapterIndex === 'number' ? chapterIndex : 0,
        progressPercentage: typeof progressPercentage === 'number' ? progressPercentage : 0,
        status: status || 'in_progress',
        revisionStatus: revisionStatus || 'none',
        masteryGrade: masteryGrade || 'good',
        recitationDate: recitationDate ? new Date(recitationDate) : new Date(),
        notes: (notes || '').trim()
    })

    return await StudentMatnProgress.findById(progress._id)
        .populate('student', 'name firstName lastName email currentLevel')
        .populate('matn', 'name level chapters')
        .populate('teacher', 'name firstName lastName email')
        .populate('halaqa', 'name')
}

const updateStudentMatnProgress = async (id, progressData, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بتعديل بيانات المتون')
        err.statusCode = 403
        throw err
    }

    const progress = await StudentMatnProgress.findById(id)
    if (!progress) {
        const err = new Error('سجل الحفظ غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role === 'teacher') {
        const halaqa = await Halaqa.findOne({ teacher: user._id, students: progress.student })
        if (!halaqa) {
            const err = new Error('لا يمكنك تعديل سجل طالب خارج حلقتك')
            err.statusCode = 403
            throw err
        }
    }

    const { section, chapterIndex, progressPercentage, status, revisionStatus, masteryGrade, recitationDate, notes } = progressData

    if (section !== undefined) progress.section = section.trim()
    if (chapterIndex !== undefined) progress.chapterIndex = Number(chapterIndex)
    if (progressPercentage !== undefined) progress.progressPercentage = Number(progressPercentage)
    if (status !== undefined) progress.status = status
    if (revisionStatus !== undefined) progress.revisionStatus = revisionStatus
    if (masteryGrade !== undefined) progress.masteryGrade = masteryGrade
    if (recitationDate !== undefined) progress.recitationDate = new Date(recitationDate)
    if (notes !== undefined) progress.notes = notes.trim()

    await progress.save()

    return await StudentMatnProgress.findById(progress._id)
        .populate('student', 'name firstName lastName email currentLevel')
        .populate('matn', 'name level chapters')
        .populate('teacher', 'name firstName lastName email')
        .populate('halaqa', 'name')
}

const deleteStudentMatnProgress = async (id, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بحذف سجل الحفظ')
        err.statusCode = 403
        throw err
    }

    const progress = await StudentMatnProgress.findById(id)
    if (!progress) {
        const err = new Error('سجل الحفظ غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role === 'teacher') {
        const halaqa = await Halaqa.findOne({ teacher: user._id, students: progress.student })
        if (!halaqa) {
            const err = new Error('لا يمكنك حذف سجل طالب خارج حلقتك')
            err.statusCode = 403
            throw err
        }
    }

    await StudentMatnProgress.findByIdAndDelete(id)
    return { message: 'تم حذف السجل بنجاح' }
}

module.exports = {
    getMatns,
    getMatnById,
    createMatn,
    updateMatn,
    deleteMatn,
    getMatnProgress,
    getStudentMatnProgressByStudentId,
    createStudentMatnProgress,
    updateStudentMatnProgress,
    deleteStudentMatnProgress
}


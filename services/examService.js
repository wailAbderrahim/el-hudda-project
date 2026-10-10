const Exam = require('../models/examModel')
const ExamAttempt = require('../models/examAttemptModel')
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Level = require('../models/levelModel')
const notificationService = require('./notificationService')

/**
 * Strips correctAnswer from questions for student visibility
 */
const stripCorrectAnswers = (questions) => {
    return questions.map(q => {
        const obj = q.toObject ? q.toObject() : { ...q }
        delete obj.correctAnswer
        return obj
    })
}

const getExams = async (user) => {
    if (user.role === 'admin') {
        return await Exam.find()
            .sort({ createdAt: -1 })
            .populate('targetLevel', 'name order')
            .populate('targetMatn', 'name')
            .populate('targetHalaqa', 'name')
            .populate('teacher', 'name firstName lastName email')
    }

    if (user.role === 'teacher') {
        const halaqas = await Halaqa.find({ teacher: user._id }).select('_id')
        const halaqaIds = halaqas.map(h => h._id)

        return await Exam.find({
            $or: [
                { teacher: user._id },
                { targetHalaqa: { $in: halaqaIds } }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('targetLevel', 'name order')
            .populate('targetMatn', 'name')
            .populate('targetHalaqa', 'name')
            .populate('teacher', 'name firstName lastName email')
    }

    if (user.role === 'student') {
        const student = await User.findById(user._id)
        const halaqa = await Halaqa.findOne({ students: user._id })
        const halaqaId = halaqa ? halaqa._id : null
        const currentLevelId = student.currentLevel || null

        const orConditions = [
            { targetStudents: user._id }
        ]
        if (halaqaId) orConditions.push({ targetHalaqa: halaqaId })
        if (currentLevelId) orConditions.push({ targetLevel: currentLevelId })
        orConditions.push({
            targetStudents: { $size: 0 },
            targetHalaqa: null,
            targetLevel: null
        })

        const exams = await Exam.find({
            status: { $in: ['active', 'ended'] },
            $or: orConditions
        })
            .sort({ startDate: -1, createdAt: -1 })
            .populate('targetLevel', 'name order')
            .populate('targetMatn', 'name')
            .populate('targetHalaqa', 'name')
            .populate('teacher', 'name')

        // Fetch student's attempts for these exams
        const examIds = exams.map(e => e._id)
        const attempts = await ExamAttempt.find({
            student: user._id,
            exam: { $in: examIds }
        })

        const attemptsMap = {}
        attempts.forEach(att => {
            attemptsMap[att.exam.toString()] = att
        })

        return exams.map(exam => {
            const examObj = exam.toObject()
            examObj.questions = stripCorrectAnswers(examObj.questions)
            const myAttempt = attemptsMap[exam._id.toString()]
            examObj.myAttempt = myAttempt ? {
                _id: myAttempt._id,
                status: myAttempt.status,
                startedAt: myAttempt.startedAt,
                submittedAt: myAttempt.submittedAt,
                score: (exam.isResultsPublished || myAttempt.status === 'published') ? myAttempt.score : null,
                totalScore: myAttempt.totalScore,
                percentage: (exam.isResultsPublished || myAttempt.status === 'published') ? myAttempt.percentage : null,
                isPassed: (exam.isResultsPublished || myAttempt.status === 'published') ? myAttempt.isPassed : null
            } : null
            return examObj
        })
    }

    return []
}

const getExamById = async (examId, user) => {
    const exam = await Exam.findById(examId)
        .populate('targetLevel', 'name order')
        .populate('targetMatn', 'name')
        .populate('targetHalaqa', 'name')
        .populate('teacher', 'name firstName lastName email')
        .populate('targetStudents', 'name email')

    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    const examObj = exam.toObject()

    if (user.role === 'student') {
        const isPublished = exam.isResultsPublished
        if (!isPublished) {
            examObj.questions = stripCorrectAnswers(examObj.questions)
        }
        const myAttempt = await ExamAttempt.findOne({ student: user._id, exam: examId })
        if (myAttempt) {
            examObj.myAttempt = {
                _id: myAttempt._id,
                status: myAttempt.status,
                startedAt: myAttempt.startedAt,
                submittedAt: myAttempt.submittedAt,
                durationSpentSeconds: myAttempt.durationSpentSeconds,
                answers: myAttempt.answers,
                score: (isPublished || myAttempt.status === 'published') ? myAttempt.score : null,
                totalScore: myAttempt.totalScore,
                percentage: (isPublished || myAttempt.status === 'published') ? myAttempt.percentage : null,
                isPassed: (isPublished || myAttempt.status === 'published') ? myAttempt.isPassed : null,
                teacherNotes: (isPublished || myAttempt.status === 'published') ? myAttempt.teacherNotes : ''
            }
        } else {
            examObj.myAttempt = null
        }
    }

    return examObj
}

const createExam = async (examData, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بإنشاء امتحانات')
        err.statusCode = 403
        throw err
    }

    const {
        title,
        description,
        instructions,
        type,
        format,
        targetLevel,
        targetMatn,
        targetHalaqa,
        targetStudents,
        startDate,
        endDate,
        durationMinutes,
        totalScore,
        passingScore,
        status,
        autoPromoteOnPass,
        questions
    } = examData

    if (!title || !title.trim()) {
        const err = new Error('عنوان الامتحان مطلوب')
        err.statusCode = 400
        throw err
    }

    if (!type || !['quran', 'matn', 'level', 'periodic'].includes(type)) {
        const err = new Error('نوع الامتحان غير صالح')
        err.statusCode = 400
        throw err
    }

    if (!format || !['in_person', 'online'].includes(format)) {
        const err = new Error('نمط الامتحان غير صالح (حضوري أو عن بعد)')
        err.statusCode = 400
        throw err
    }

    const tScore = Number(totalScore) || 100
    const pScore = Number(passingScore) || 60
    if (pScore > tScore) {
        const err = new Error('درجة النجاح لا يمكن أن تتجاوز العلامة القصوى')
        err.statusCode = 400
        throw err
    }

    const normalizedQuestions = Array.isArray(questions) ? questions.map((q, idx) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        text: (q.text || '').trim(),
        type: q.type || 'single_choice',
        options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
        correctAnswer: (q.correctAnswer !== undefined ? String(q.correctAnswer) : '').trim(),
        points: typeof q.points === 'number' ? q.points : 10,
        rubric: (q.rubric || '').trim()
    })) : []

    const exam = await Exam.create({
        title: title.trim(),
        description: (description || '').trim(),
        instructions: (instructions || '').trim(),
        type,
        format,
        targetLevel: targetLevel || null,
        targetMatn: targetMatn || null,
        targetHalaqa: targetHalaqa || null,
        targetStudents: Array.isArray(targetStudents) ? targetStudents : [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : 45,
        totalScore: tScore,
        passingScore: pScore,
        teacher: user._id,
        status: status || 'draft',
        isResultsPublished: false,
        autoPromoteOnPass: Boolean(autoPromoteOnPass),
        questions: normalizedQuestions
    })

    return exam
}

const updateExam = async (examId, examData, user) => {
    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role !== 'admin' && exam.teacher.toString() !== user._id.toString()) {
        const err = new Error('غير مصرح لك بتعديل هذا الامتحان')
        err.statusCode = 403
        throw err
    }

    const {
        title,
        description,
        instructions,
        type,
        format,
        targetLevel,
        targetMatn,
        targetHalaqa,
        targetStudents,
        startDate,
        endDate,
        durationMinutes,
        totalScore,
        passingScore,
        status,
        autoPromoteOnPass,
        questions
    } = examData

    if (title !== undefined) exam.title = title.trim()
    if (description !== undefined) exam.description = description.trim()
    if (instructions !== undefined) exam.instructions = instructions.trim()
    if (type !== undefined) exam.type = type
    if (format !== undefined) exam.format = format
    if (targetLevel !== undefined) exam.targetLevel = targetLevel || null
    if (targetMatn !== undefined) exam.targetMatn = targetMatn || null
    if (targetHalaqa !== undefined) exam.targetHalaqa = targetHalaqa || null
    if (targetStudents !== undefined) exam.targetStudents = Array.isArray(targetStudents) ? targetStudents : []
    if (startDate !== undefined) exam.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) exam.endDate = endDate ? new Date(endDate) : null
    if (durationMinutes !== undefined) exam.durationMinutes = Number(durationMinutes)
    if (totalScore !== undefined) exam.totalScore = Number(totalScore)
    if (passingScore !== undefined) exam.passingScore = Number(passingScore)
    if (status !== undefined) exam.status = status
    if (autoPromoteOnPass !== undefined) exam.autoPromoteOnPass = Boolean(autoPromoteOnPass)
    if (Array.isArray(questions)) {
        exam.questions = questions.map((q, idx) => ({
            id: q.id || `q_${Date.now()}_${idx}`,
            text: (q.text || '').trim(),
            type: q.type || 'single_choice',
            options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
            correctAnswer: (q.correctAnswer !== undefined ? String(q.correctAnswer) : '').trim(),
            points: typeof q.points === 'number' ? q.points : 10,
            rubric: (q.rubric || '').trim()
        }))
    }

    await exam.save()
    return exam
}

const deleteExam = async (examId, user) => {
    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role !== 'admin' && exam.teacher.toString() !== user._id.toString()) {
        const err = new Error('غير مصرح لك بحذف هذا الامتحان')
        err.statusCode = 403
        throw err
    }

    await ExamAttempt.deleteMany({ exam: examId })
    await Exam.findByIdAndDelete(examId)

    return { message: 'تم حذف الامتحان وجميع محاولاته بنجاح' }
}

/**
 * Student starts taking an online exam
 */
const startExamAttempt = async (examId, user) => {
    if (user.role !== 'student') {
        const err = new Error('بدء الامتحان مخصص للطلاب فقط')
        err.statusCode = 403
        throw err
    }

    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    if (exam.status !== 'active') {
        const err = new Error('هذا الامتحان غير متاح للتقديم حالياً')
        err.statusCode = 400
        throw err
    }

    const now = new Date()
    if (exam.startDate && now < new Date(exam.startDate)) {
        const err = new Error('لم يحن موعد بدء الامتحان بعد')
        err.statusCode = 400
        throw err
    }
    if (exam.endDate && now > new Date(exam.endDate)) {
        const err = new Error('انتهت فترة الامتحان المحددة')
        err.statusCode = 400
        throw err
    }

    let attempt = await ExamAttempt.findOne({ student: user._id, exam: examId })

    if (attempt) {
        if (['submitted', 'grading', 'approved', 'published'].includes(attempt.status)) {
            const err = new Error('لقد قمت بإرسال إجابات هذا الامتحان مسبقاً')
            err.statusCode = 400
            err.code = 'ALREADY_SUBMITTED'
            throw err
        }

        // Check if duration has expired server-side
        const maxDurationMs = (exam.durationMinutes * 60 + 60) * 1000 // 60s grace
        const elapsedMs = now.getTime() - attempt.startedAt.getTime()
        if (elapsedMs > maxDurationMs) {
            // Auto submit what was saved
            return await submitExamAttempt(examId, null, user)
        }

        const strippedQuestions = stripCorrectAnswers(exam.questions)
        return {
            attempt,
            exam: {
                ...exam.toObject(),
                questions: strippedQuestions
            },
            timeRemainingSeconds: Math.max(0, Math.round((maxDurationMs - elapsedMs) / 1000))
        }
    }

    // Initialize answer slots for each question
    const initialAnswers = exam.questions.map((q, idx) => ({
        questionIndex: idx,
        questionId: q.id,
        answer: '',
        score: null,
        feedback: '',
        autoGraded: false
    }))

    attempt = await ExamAttempt.create({
        student: user._id,
        exam: examId,
        answers: initialAnswers,
        startedAt: now,
        lastSavedAt: now,
        status: 'in_progress',
        totalScore: exam.totalScore
    })

    const strippedQuestions = stripCorrectAnswers(exam.questions)
    return {
        attempt,
        exam: {
            ...exam.toObject(),
            questions: strippedQuestions
        },
        timeRemainingSeconds: exam.durationMinutes * 60
    }
}

/**
 * Incremental progressive auto-save during exam
 */
const saveExamProgress = async (examId, answers, user) => {
    if (user.role !== 'student') {
        const err = new Error('غير مصرح')
        err.statusCode = 403
        throw err
    }

    const attempt = await ExamAttempt.findOne({ student: user._id, exam: examId })
    if (!attempt) {
        const err = new Error('لم يتم العثور على محاولة نشطة للامتحان')
        err.statusCode = 404
        throw err
    }

    if (attempt.status !== 'in_progress') {
        const err = new Error('لا يمكن حفظ الإجابات؛ تم تسليم الامتحان مسبقاً')
        err.statusCode = 400
        throw err
    }

    const exam = await Exam.findById(examId)
    const now = new Date()
    const maxDurationMs = ((exam ? exam.durationMinutes : 45) * 60 + 120) * 1000
    const elapsedMs = now.getTime() - attempt.startedAt.getTime()

    if (elapsedMs > maxDurationMs) {
        await submitExamAttempt(examId, answers, user)
        const err = new Error('انتهى الوقت المحدد للامتحان وتم تسليمه تلقائياً')
        err.statusCode = 400
        err.code = 'TIME_EXPIRED'
        throw err
    }

    if (Array.isArray(answers)) {
        answers.forEach(item => {
            const existing = attempt.answers.find(a => a.questionIndex === item.questionIndex)
            if (existing) {
                existing.answer = item.answer !== undefined ? item.answer : existing.answer
            } else {
                attempt.answers.push({
                    questionIndex: item.questionIndex,
                    questionId: item.questionId || '',
                    answer: item.answer || '',
                    score: null,
                    feedback: '',
                    autoGraded: false
                })
            }
        })
    }

    attempt.lastSavedAt = now
    await attempt.save()

    return {
        message: 'تم حفظ الإجابات بنجاح',
        lastSavedAt: attempt.lastSavedAt
    }
}

/**
 * Final submit of the exam attempt
 */
const submitExamAttempt = async (examId, finalAnswers, user) => {
    if (user.role !== 'student') {
        const err = new Error('غير مصرح')
        err.statusCode = 403
        throw err
    }

    const attempt = await ExamAttempt.findOne({ student: user._id, exam: examId })
    if (!attempt) {
        const err = new Error('لم يتم العثور على محاولة للامتحان')
        err.statusCode = 404
        throw err
    }

    if (['submitted', 'grading', 'approved', 'published'].includes(attempt.status)) {
        return attempt
    }

    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    // Merge any final answers
    if (Array.isArray(finalAnswers)) {
        finalAnswers.forEach(item => {
            const existing = attempt.answers.find(a => a.questionIndex === item.questionIndex)
            if (existing) {
                existing.answer = item.answer !== undefined ? item.answer : existing.answer
            } else {
                attempt.answers.push({
                    questionIndex: item.questionIndex,
                    questionId: item.questionId || '',
                    answer: item.answer || '',
                    score: null,
                    feedback: '',
                    autoGraded: false
                })
            }
        })
    }

    const now = new Date()
    attempt.submittedAt = now
    attempt.durationSpentSeconds = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)

    // Auto-grading for objective questions (single_choice, true_false)
    let autoGradedPoints = 0
    let allQuestionsAutoGraded = true

    exam.questions.forEach((q, idx) => {
        const ans = attempt.answers.find(a => a.questionIndex === idx)
        if (!ans) return

        if (q.type === 'single_choice' || q.type === 'true_false') {
            const studentAns = String(ans.answer || '').trim().toLowerCase()
            const correctAns = String(q.correctAnswer || '').trim().toLowerCase()

            if (studentAns && studentAns === correctAns) {
                ans.score = q.points
            } else {
                ans.score = 0
            }
            ans.autoGraded = true
            autoGradedPoints += ans.score
        } else {
            allQuestionsAutoGraded = false
        }
    })

    attempt.totalScore = exam.totalScore

    if (allQuestionsAutoGraded && exam.questions.length > 0) {
        attempt.score = autoGradedPoints
        attempt.percentage = exam.totalScore > 0 ? Number(((autoGradedPoints / exam.totalScore) * 100).toFixed(1)) : 0
        attempt.isPassed = attempt.score >= exam.passingScore
        attempt.status = 'approved'
        attempt.gradedAt = now
    } else {
        attempt.status = 'grading'
    }

    await attempt.save()

    // Notify teacher
    try {
        await notificationService.createNotification({
            recipient: exam.teacher,
            title: 'تسليم امتحان جديد',
            message: `قام الطالب بإرسال إجابات امتحان: ${exam.title}`,
            type: 'exam'
        })
    } catch (_) {}

    return {
        message: 'تم تسليم الامتحان بنجاح',
        attempt
    }
}

const getExamAttempts = async (examId, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بالاطلاع على محاولات الطلاب')
        err.statusCode = 403
        throw err
    }

    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    if (user.role === 'teacher' && exam.teacher.toString() !== user._id.toString()) {
        const err = new Error('غير مصرح لك بإدارة هذا الامتحان')
        err.statusCode = 403
        throw err
    }

    return await ExamAttempt.find({ exam: examId })
        .sort({ submittedAt: -1, startedAt: -1 })
        .populate('student', 'name firstName lastName email phone currentLevel')
        .populate('gradedBy', 'name')
}

const gradeAttempt = async (attemptId, gradeData, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك برصد الدرجات')
        err.statusCode = 403
        throw err
    }

    const attempt = await ExamAttempt.findById(attemptId).populate('exam')
    if (!attempt) {
        const err = new Error('المحاولة غير موجودة')
        err.statusCode = 404
        throw err
    }

    const exam = attempt.exam
    if (user.role === 'teacher' && exam.teacher.toString() !== user._id.toString()) {
        const err = new Error('لا يمكنك تصحيح امتحان لمعلم آخر')
        err.statusCode = 403
        throw err
    }

    const { answersScores, teacherNotes, isApproved, directScore } = gradeData

    if (typeof directScore === 'number') {
        // Direct score entry (especially for in_person or oral recitation exams)
        if (directScore < 0 || directScore > exam.totalScore) {
            const err = new Error(`العلامة يجب أن تكون بين 0 و ${exam.totalScore}`)
            err.statusCode = 400
            throw err
        }
        attempt.score = directScore
    } else if (Array.isArray(answersScores)) {
        answersScores.forEach(item => {
            const ans = attempt.answers.find(a => a.questionIndex === item.questionIndex)
            if (ans) {
                if (typeof item.score === 'number') ans.score = item.score
                if (item.feedback !== undefined) ans.feedback = item.feedback.trim()
            }
        })

        // Sum up score
        let total = 0
        attempt.answers.forEach(a => {
            if (typeof a.score === 'number') total += a.score
        })
        attempt.score = Math.min(total, exam.totalScore)
    }

    if (teacherNotes !== undefined) {
        attempt.teacherNotes = teacherNotes.trim()
    }

    attempt.totalScore = exam.totalScore
    if (typeof attempt.score === 'number') {
        attempt.percentage = exam.totalScore > 0 ? Number(((attempt.score / exam.totalScore) * 100).toFixed(1)) : 0
        attempt.isPassed = attempt.score >= exam.passingScore
    }

    attempt.gradedBy = user._id
    attempt.gradedAt = new Date()

    if (isApproved) {
        attempt.status = exam.isResultsPublished ? 'published' : 'approved'
    } else {
        attempt.status = 'grading'
    }

    await attempt.save()

    return attempt
}

const publishExamResults = async (examId, user) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بنشر النتائج')
        err.statusCode = 403
        throw err
    }

    const exam = await Exam.findById(examId)
    if (!exam) {
        const err = new Error('الامتحان غير موجود')
        err.statusCode = 404
        throw err
    }

    exam.isResultsPublished = true
    await exam.save()

    // Update all approved attempts to published
    await ExamAttempt.updateMany(
        { exam: examId, status: 'approved' },
        { status: 'published' }
    )

    // Notify students
    const attempts = await ExamAttempt.find({ exam: examId, status: 'published' })
    for (const att of attempts) {
        try {
            await notificationService.createNotification({
                recipient: att.student,
                title: 'إعلان نتيجة الامتحان',
                message: `تم اعتماد ونشر نتيجة امتحان: ${exam.title} (${att.score}/${exam.totalScore})`,
                type: 'exam'
            })
        } catch (_) {}
    }

    return { message: 'تم نشر نتائج الامتحان بنجاح' }
}

const getStudentResults = async (studentId, user) => {
    if (user.role === 'student' && user._id.toString() !== studentId.toString()) {
        const err = new Error('غير مصرح لك بعرض نتائج طالب آخر')
        err.statusCode = 403
        throw err
    }

    let filter = { student: studentId }
    if (user.role === 'student') {
        // Students see published results or exams with approved/published status
        filter.status = { $in: ['approved', 'published'] }
    }

    return await ExamAttempt.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .populate({
            path: 'exam',
            select: 'title type format totalScore passingScore targetLevel targetMatn isResultsPublished description',
            populate: [
                { path: 'targetLevel', select: 'name order' },
                { path: 'targetMatn', select: 'name' }
            ]
        })
        .populate('gradedBy', 'name')
}

module.exports = {
    getExams,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
    startExamAttempt,
    saveExamProgress,
    submitExamAttempt,
    getExamAttempts,
    gradeAttempt,
    publishExamResults,
    getStudentResults
}


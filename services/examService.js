const Exam = require('../models/examModel')
const ExamAttempt = require('../models/examAttemptModel')
const User = require('../models/userModel')
const Halaqa = require('../models/halaqaModel')
const Level = require('../models/levelModel')
const StudentLevelHistory = require('../models/studentLevelHistoryModel')
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

const notifyTargetedStudentsAboutExam = async (exam) => {
    try {
        let studentIds = []
        if (exam.targetStudents && exam.targetStudents.length > 0) {
            studentIds = exam.targetStudents
        } else if (exam.targetHalaqa) {
            const h = await Halaqa.findById(exam.targetHalaqa)
            if (h && h.students) studentIds = h.students
        } else if (exam.targetLevel) {
            const studentsInLevel = await User.find({ currentLevel: exam.targetLevel, role: 'student' }).select('_id')
            studentIds = studentsInLevel.map(s => s._id)
        } else {
            const allStudents = await User.find({ role: 'student' }).select('_id')
            studentIds = allStudents.map(s => s._id)
        }

        for (const sId of studentIds) {
            try {
                await notificationService.createNotification({
                    recipient: sId,
                    title: 'امتحان جديد متاح',
                    message: `تم نشر امتحان جديد: ${exam.title} (${exam.format === 'online' ? 'إلكتروني' : 'حضوري'})`,
                    type: 'exam'
                })
            } catch (_) {}
        }
    } catch (_) {}
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
        const currentLevelId = student ? student.currentLevel : null

        const orConditions = [
            { targetStudents: user._id },
            {
                $and: [
                    { $or: [{ targetLevel: null }, { targetLevel: { $exists: false } }] },
                    { $or: [{ targetHalaqa: null }, { targetHalaqa: { $exists: false } }] },
                    { $or: [{ targetStudents: { $size: 0 } }, { targetStudents: null }, { targetStudents: { $exists: false } }] }
                ]
            }
        ]
        if (halaqaId) orConditions.push({ targetHalaqa: halaqaId })
        if (currentLevelId) orConditions.push({ targetLevel: currentLevelId })

        const exams = await Exam.find({
            status: { $in: ['active', 'scheduled', 'ongoing', 'ended', 'completed', 'graded', 'published'] },
            $or: orConditions
        })
            .sort({ startDate: -1, createdAt: -1 })
            .populate('targetLevel', 'name order')
            .populate('targetMatn', 'name')
            .populate('targetHalaqa', 'name')
            .populate('teacher', 'name firstName lastName')

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

    const examFormat = (format || examData.mode || 'online').toLowerCase()
    if (!['in_person', 'online'].includes(examFormat)) {
        const err = new Error('نمط الامتحان غير صالح (حضوري أو عن بعد)')
        err.statusCode = 400
        throw err
    }

    const tScore = Number(totalScore || examData.totalMarks) || 100
    let pScore = Number(passingScore) || 60
    if (pScore > tScore && pScore <= 100 && tScore > 0) {
        pScore = Math.round((pScore / 100) * tScore)
    } else if (pScore > tScore) {
        const err = new Error('درجة النجاح لا يمكن أن تتجاوز العلامة القصوى')
        err.statusCode = 400
        throw err
    }

    const normalizedQuestions = Array.isArray(questions) ? questions.map((q, idx) => {
        let qOptions = []
        let qCorrect = (q.correctAnswer !== undefined ? String(q.correctAnswer) : '').trim()

        if (Array.isArray(q.options)) {
            qOptions = q.options.map(o => {
                if (typeof o === 'object' && o !== null) {
                    if (o.isCorrect && !qCorrect) {
                        qCorrect = String(o.text || '').trim()
                    }
                    return String(o.text || '').trim()
                }
                return String(o).trim()
            })
        }

        return {
            id: q.id || `q_${Date.now()}_${idx}`,
            text: (q.text || q.questionText || '').trim(),
            type: q.type || 'single_choice',
            options: qOptions,
            correctAnswer: qCorrect,
            points: typeof q.points === 'number' ? q.points : (typeof q.marks === 'number' ? q.marks : 10),
            rubric: (q.rubric || '').trim()
        }
    }) : []

    if (user.role === 'teacher' && targetHalaqa) {
        const h = await Halaqa.findById(targetHalaqa)
        if (!h || h.teacher.toString() !== user._id.toString()) {
            const err = new Error('لا يمكنك إنشاء امتحان لحلقة لا تشرف عليها')
            err.statusCode = 403
            throw err
        }
    }

    const assignedTeacher = (user.role === 'admin' && (examData.teacher || examData.teacherId))
        ? (examData.teacher || examData.teacherId)
        : user._id

    const exam = await Exam.create({
        title: title.trim(),
        description: (description || '').trim(),
        instructions: (instructions || '').trim(),
        type,
        format: examFormat,
        targetLevel: targetLevel || null,
        targetMatn: targetMatn || null,
        targetHalaqa: targetHalaqa || null,
        targetStudents: Array.isArray(targetStudents) ? targetStudents : [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : 45,
        totalScore: tScore,
        passingScore: pScore,
        teacher: assignedTeacher,
        status: status || 'active',
        isResultsPublished: false,
        autoPromoteOnPass: Boolean(autoPromoteOnPass),
        questions: normalizedQuestions
    })

    if (exam.status === 'active' || exam.status === 'scheduled') {
        notifyTargetedStudentsAboutExam(exam)
    }

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

    const prevStatus = exam.status

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

    if (exam.status === 'active' && prevStatus !== 'active') {
        notifyTargetedStudentsAboutExam(exam)
    }

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

    if (!['active', 'scheduled', 'ongoing'].includes(exam.status)) {
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
            const rawAns = item.answer !== undefined ? item.answer : (item.answerText !== undefined ? item.answerText : '')
            let qIdx = (typeof item.questionIndex === 'number') ? item.questionIndex : -1
            if (qIdx < 0 && exam && Array.isArray(exam.questions)) {
                qIdx = exam.questions.findIndex(q => String(q._id || q.id) === String(item.questionId || item.question))
            }
            if (qIdx >= 0) {
                const existing = attempt.answers.find(a => a.questionIndex === qIdx)
                if (existing) {
                    existing.answer = rawAns
                    if (item.questionId) existing.questionId = item.questionId
                } else {
                    attempt.answers.push({
                        questionIndex: qIdx,
                        questionId: item.questionId || (exam.questions[qIdx] ? String(exam.questions[qIdx]._id || exam.questions[qIdx].id) : ''),
                        answer: rawAns,
                        score: null,
                        feedback: '',
                        autoGraded: false
                    })
                }
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
            const rawAns = item.answer !== undefined ? item.answer : (item.answerText !== undefined ? item.answerText : '')
            let qIdx = (typeof item.questionIndex === 'number') ? item.questionIndex : -1
            if (qIdx < 0 && exam && Array.isArray(exam.questions)) {
                qIdx = exam.questions.findIndex(q => String(q._id || q.id) === String(item.questionId || item.question))
            }
            if (qIdx >= 0) {
                const existing = attempt.answers.find(a => a.questionIndex === qIdx)
                if (existing) {
                    existing.answer = rawAns
                    if (item.questionId) existing.questionId = item.questionId
                } else {
                    attempt.answers.push({
                        questionIndex: qIdx,
                        questionId: item.questionId || (exam.questions[qIdx] ? String(exam.questions[qIdx]._id || exam.questions[qIdx].id) : ''),
                        answer: rawAns,
                        score: null,
                        feedback: '',
                        autoGraded: false
                    })
                }
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

        if (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'true_false') {
            const studentAns = String(ans.answer !== undefined ? ans.answer : '').trim().toLowerCase()
            const correctAns = String(q.correctAnswer !== undefined ? q.correctAnswer : '').trim().toLowerCase()

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

    // Notify student of receipt
    try {
        await notificationService.createNotification({
            recipient: user._id,
            title: 'تم استلام إجابات الامتحان بنجاح',
            message: `تم تسليم إجاباتك لامتحان: ${exam.title} بنجاح، وستظهر نتيجتك فور اعتمادها ونشرها.`,
            type: 'exam'
        })
    } catch (_) {}

    return {
        message: 'تم تسليم الامتحان بنجاح',
        attempt
    }
}

/**
 * Enriches attempt object with full question text, types, options, and unified property aliases
 */
const enrichAttemptWithQuestions = (att, examSource) => {
    const obj = att.toObject ? att.toObject() : { ...att }
    const examQuestions = (examSource && examSource.questions && examSource.questions.length > 0)
        ? examSource.questions
        : (obj.exam && obj.exam.questions && obj.exam.questions.length > 0 ? obj.exam.questions : [])

    if (examSource && (!obj.exam || typeof obj.exam !== 'object')) {
        obj.exam = {
            _id: examSource._id,
            title: examSource.title,
            type: examSource.type,
            format: examSource.format,
            totalScore: examSource.totalScore,
            passingScore: examSource.passingScore,
            isResultsPublished: examSource.isResultsPublished,
            questions: examQuestions
        }
    } else if (obj.exam && typeof obj.exam === 'object' && (!obj.exam.questions || obj.exam.questions.length === 0)) {
        obj.exam.questions = examQuestions
    }

    if (Array.isArray(obj.answers)) {
        obj.answers = obj.answers.map((ans, idx) => {
            const rawAns = ans.toObject ? ans.toObject() : { ...ans }
            const q = examQuestions.find(eq =>
                (eq.id && String(eq.id) === String(rawAns.questionId)) ||
                (eq._id && String(eq._id) === String(rawAns.questionId))
            ) || examQuestions[rawAns.questionIndex !== undefined ? rawAns.questionIndex : idx]

            const qText = q ? q.text : (rawAns.questionText || `السؤال رقم ${idx + 1}`)
            const qType = q ? q.type : (rawAns.questionType || 'single_choice')
            const qPoints = q ? (typeof q.points === 'number' ? q.points : 10) : 10
            const qOptions = q && Array.isArray(q.options) ? q.options : []
            const qCorrect = q ? (q.correctAnswer || '') : ''
            const qRubric = q ? (q.rubric || '') : ''

            return {
                ...rawAns,
                questionIndex: rawAns.questionIndex !== undefined ? rawAns.questionIndex : idx,
                questionId: rawAns.questionId || (q ? String(q.id || q._id) : `q_${idx}`),
                questionText: qText,
                questionType: qType,
                options: qOptions,
                correctAnswer: qCorrect,
                points: qPoints,
                rubric: qRubric,
                // Unified aliases for all frontends (Admin, Teacher, and Student)
                score: typeof rawAns.score === 'number' ? rawAns.score : null,
                awardedScore: typeof rawAns.score === 'number' ? rawAns.score : null,
                answer: rawAns.answer !== undefined ? rawAns.answer : '',
                answerText: rawAns.answer !== undefined ? String(rawAns.answer) : '',
                feedback: rawAns.feedback || '',
                teacherFeedback: rawAns.feedback || '',
                question: {
                    questionText: qText,
                    type: qType,
                    points: qPoints,
                    options: qOptions
                }
            }
        })
    }

    return obj
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

    const attempts = await ExamAttempt.find({ exam: examId })
        .sort({ submittedAt: -1, startedAt: -1 })
        .populate('student', 'name firstName lastName email phone currentLevel')
        .populate('gradedBy', 'name')
        .populate({
            path: 'exam',
            select: 'title type format totalScore passingScore questions isResultsPublished'
        })

    return attempts.map(att => enrichAttemptWithQuestions(att, exam))
}

const getAllAttempts = async (user, query = {}) => {
    if (user.role !== 'admin' && user.role !== 'teacher') {
        const err = new Error('غير مصرح لك بالاطلاع على محاولات الطلاب')
        err.statusCode = 403
        throw err
    }

    const filter = {}
    if (query.examId) {
        filter.exam = query.examId
    } else if (user.role === 'teacher') {
        const teacherExams = await Exam.find({ teacher: user._id }).select('_id')
        filter.exam = { $in: teacherExams.map(e => e._id) }
    }

    if (query.status) {
        filter.status = query.status
    }

    const attempts = await ExamAttempt.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .populate('exam', 'title totalScore passingScore type format isResultsPublished questions')
        .populate('student', 'name firstName lastName email phone currentLevel')
        .populate('gradedBy', 'name')

    return attempts.map(att => enrichAttemptWithQuestions(att, att.exam))
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

    // 1. General notes / feedback
    const notes = gradeData.teacherNotes || gradeData.generalNotes || (typeof gradeData.feedback === 'string' ? gradeData.feedback : '')
    if (notes) {
        attempt.teacherNotes = notes.trim()
    }

    // 2. Individual Question Scores from Teacher Dashboard (scores object: { [qId]: score })
    if (gradeData.scores && typeof gradeData.scores === 'object' && !Array.isArray(gradeData.scores)) {
        Object.entries(gradeData.scores).forEach(([qKey, sVal]) => {
            const scoreNum = parseFloat(sVal)
            if (isNaN(scoreNum)) return

            const ans = attempt.answers.find(a =>
                (a.questionId && String(a.questionId) === String(qKey)) ||
                (exam.questions && exam.questions.some(eq =>
                    (String(eq._id) === String(qKey) || String(eq.id) === String(qKey)) &&
                    (eq.id === a.questionId || eq._id?.toString() === a.questionId)
                ))
            ) || attempt.answers[parseInt(qKey, 10)]

            if (ans) {
                ans.score = scoreNum
                ans.autoGraded = false
            }
        })
    }

    // Individual Feedback per question from Teacher (feedback object: { [qId]: fb })
    if (gradeData.feedback && typeof gradeData.feedback === 'object' && !Array.isArray(gradeData.feedback)) {
        Object.entries(gradeData.feedback).forEach(([qKey, fbVal]) => {
            if (typeof fbVal !== 'string') return
            const ans = attempt.answers.find(a =>
                (a.questionId && String(a.questionId) === String(qKey)) ||
                (exam.questions && exam.questions.some(eq =>
                    (String(eq._id) === String(qKey) || String(eq.id) === String(qKey)) &&
                    (eq.id === a.questionId || eq._id?.toString() === a.questionId)
                ))
            ) || attempt.answers[parseInt(qKey, 10)]

            if (ans) {
                ans.feedback = fbVal.trim()
            }
        })
    }

    // 3. Array of Question Scores (Admin dashboard questionScores, or legacy answersScores/grades)
    const scoresList = Array.isArray(gradeData.questionScores)
        ? gradeData.questionScores
        : (Array.isArray(gradeData.answersScores)
            ? gradeData.answersScores
            : (Array.isArray(gradeData.grades) ? gradeData.grades : null))

    if (scoresList) {
        scoresList.forEach(item => {
            const qIdx = typeof item.questionIndex === 'number' ? item.questionIndex : parseInt(item.idx, 10)
            const ans = attempt.answers.find(a =>
                (typeof qIdx === 'number' && !isNaN(qIdx) && a.questionIndex === qIdx) ||
                (item.questionId && String(a.questionId) === String(item.questionId)) ||
                (exam.questions && exam.questions[qIdx] && (exam.questions[qIdx].id === a.questionId || exam.questions[qIdx]._id?.toString() === a.questionId))
            )

            if (ans) {
                const s = typeof item.score === 'number' ? item.score : parseFloat(item.score)
                if (!isNaN(s)) ans.score = s
                const fb = item.feedback || item.teacherNotes
                if (fb && typeof fb === 'string') ans.feedback = fb.trim()
                ans.autoGraded = false
            }
        })
    }

    // 4. Overall Score Calculation
    const direct = typeof gradeData.directScore === 'number'
        ? gradeData.directScore
        : (typeof gradeData.totalScore === 'number'
            ? gradeData.totalScore
            : (typeof gradeData.score === 'number' ? gradeData.score : null))

    if (direct !== null && !isNaN(direct) && (!scoresList || scoresList.length === 0) && (!gradeData.scores || Object.keys(gradeData.scores).length === 0)) {
        attempt.score = Math.min(Math.max(0, direct), exam.totalScore)
    } else {
        // Calculate sum from answers
        let total = 0
        let hasAnyAnswerScore = false
        attempt.answers.forEach(a => {
            if (typeof a.score === 'number') {
                total += a.score
                hasAnyAnswerScore = true
            }
        })
        if (hasAnyAnswerScore) {
            attempt.score = Math.min(total, exam.totalScore)
        } else if (direct !== null && !isNaN(direct)) {
            attempt.score = Math.min(Math.max(0, direct), exam.totalScore)
        }
    }

    attempt.totalScore = exam.totalScore
    if (typeof attempt.score === 'number') {
        attempt.percentage = exam.totalScore > 0 ? Number(((attempt.score / exam.totalScore) * 100).toFixed(1)) : 0
        attempt.isPassed = attempt.score >= exam.passingScore
    }

    attempt.gradedBy = user._id
    attempt.gradedAt = new Date()

    if (exam.isResultsPublished) {
        attempt.status = 'published'
    } else {
        attempt.status = 'approved'
    }

    await attempt.save()

    return enrichAttemptWithQuestions(attempt, exam)
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

    if (user.role === 'teacher' && exam.teacher.toString() !== user._id.toString()) {
        const err = new Error('غير مصرح لك بنشر نتائج امتحان لمعلم آخر')
        err.statusCode = 403
        throw err
    }

    exam.isResultsPublished = true
    await exam.save()

    // Update all submitted/approved/graded/grading attempts to published
    await ExamAttempt.updateMany(
        { exam: examId, status: { $in: ['approved', 'graded', 'grading', 'submitted'] } },
        { status: 'published' }
    )

    // Notify students
    const attempts = await ExamAttempt.find({ exam: examId, status: 'published' })
    for (const att of attempts) {
        try {
            await notificationService.createNotification({
                recipient: att.student,
                title: 'إعلان نتيجة الامتحان',
                message: `تم اعتماد ونشر نتيجة امتحان: ${exam.title} (${att.score || 0}/${exam.totalScore})`,
                type: 'exam'
            })
        } catch (_) {}
    }

    // Auto level promotion for passing students if enabled
    if (exam.type === 'level' && exam.autoPromoteOnPass) {
        for (const att of attempts) {
            if (att.isPassed) {
                try {
                    const studentUser = await User.findById(att.student)
                    if (studentUser) {
                        const targetLvl = await Level.findById(exam.targetLevel)
                        const nextLvlId = (targetLvl && targetLvl.nextLevel) ? targetLvl.nextLevel : exam.targetLevel
                        if (nextLvlId && String(studentUser.currentLevel) !== String(nextLvlId)) {
                            const prevLevel = studentUser.currentLevel
                            studentUser.currentLevel = nextLvlId
                            await studentUser.save()
                            await StudentLevelHistory.create({
                                student: studentUser._id,
                                previousLevel: prevLevel,
                                newLevel: nextLvlId,
                                changedBy: user._id,
                                changeDate: new Date(),
                                reason: 'اجتياز امتحان الانتقال المعتمد',
                                exam: exam._id
                            })
                            await notificationService.createNotification({
                                recipient: studentUser._id,
                                title: 'ترقية المستوى التعليمي',
                                message: `تهانينا! لاجتيازك بنجاح امتحان "${exam.title}"، تمت ترقيتك للمستوى التالي.`,
                                type: 'level'
                            })
                        }
                    }
                } catch (pErr) {
                    console.error("Auto promote on pass error:", pErr)
                }
            }
        }
    }

    return { message: 'تم نشر نتائج الامتحان بنجاح' }
}

const getStudentResults = async (studentId, user) => {
    if (user.role === 'student' && user._id.toString() !== studentId.toString()) {
        const err = new Error('غير مصرح لك بعرض نتائج طالب آخر')
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

    let filter = { student: studentId }
    if (user.role === 'student') {
        // Students see published results or approved results
        filter.status = { $in: ['approved', 'published'] }
    }

    const attempts = await ExamAttempt.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .populate({
            path: 'exam',
            select: 'title type format totalScore passingScore targetLevel targetMatn isResultsPublished description questions',
            populate: [
                { path: 'targetLevel', select: 'name order' },
                { path: 'targetMatn', select: 'name' }
            ]
        })
        .populate('gradedBy', 'name')

    return attempts.map(att => enrichAttemptWithQuestions(att, att.exam))
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
    getAllAttempts,
    gradeAttempt,
    publishExamResults,
    getStudentResults
}


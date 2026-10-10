const mongoose = require('mongoose')

const answerSchema = new mongoose.Schema({
    questionIndex: {
        type: Number,
        required: true
    },
    questionId: {
        type: String,
        default: ''
    },
    answer: {
        type: mongoose.Schema.Types.Mixed,
        default: ''
    },
    score: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        trim: true,
        default: ''
    },
    autoGraded: {
        type: Boolean,
        default: false
    }
})

const examAttemptSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    answers: {
        type: [answerSchema],
        default: []
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: {
        type: Date,
        default: null
    },
    lastSavedAt: {
        type: Date,
        default: Date.now
    },
    durationSpentSeconds: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: null
    },
    totalScore: {
        type: Number,
        default: null
    },
    percentage: {
        type: Number,
        default: null
    },
    isPassed: {
        type: Boolean,
        default: null
    },
    teacherNotes: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'submitted', 'grading', 'approved', 'published'],
        default: 'in_progress'
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    gradedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

// Unique compound index so a student cannot have duplicate active attempts for the same exam
examAttemptSchema.index({ student: 1, exam: 1 })

module.exports = mongoose.model('ExamAttempt', examAttemptSchema)


const mongoose = require('mongoose')

const studentMatnProgressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    matn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Matn',
        required: true
    },
    halaqa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Halaqa',
        default: null
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    section: {
        type: String,
        required: true,
        trim: true
    },
    chapterIndex: {
        type: Number,
        default: 0
    },
    progressPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'memorizing', 'completed', 'needs_revision', 'reviewed', 'mastered'],
        default: 'in_progress'
    },
    revisionStatus: {
        type: String,
        enum: ['none', 'under_revision', 'revised'],
        default: 'none'
    },
    masteryGrade: {
        type: String,
        default: 'good'
    },
    recitationDate: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true })

module.exports = mongoose.model('StudentMatnProgress', studentMatnProgressSchema)


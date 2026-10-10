const mongoose = require('mongoose')

const studentLevelHistorySchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    previousLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        default: null
    },
    newLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        required: true
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changeDate: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        default: null
    }
}, { timestamps: true })

module.exports = mongoose.model('StudentLevelHistory', studentLevelHistorySchema)


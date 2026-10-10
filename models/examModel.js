const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['single_choice', 'true_false', 'short_answer', 'essay', 'oral_recitation'],
        required: true
    },
    options: {
        type: [String],
        default: []
    },
    correctAnswer: {
        type: String,
        default: '',
        trim: true
    },
    points: {
        type: Number,
        required: true,
        default: 10,
        min: 0
    },
    rubric: {
        type: String,
        trim: true,
        default: ''
    }
})

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    instructions: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['quran', 'matn', 'level', 'periodic'],
        required: true
    },
    format: {
        type: String,
        enum: ['in_person', 'online'],
        required: true
    },
    targetLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        default: null
    },
    targetMatn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Matn',
        default: null
    },
    targetHalaqa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Halaqa',
        default: null
    },
    targetStudents: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    durationMinutes: {
        type: Number,
        default: 45,
        min: 1
    },
    totalScore: {
        type: Number,
        required: true,
        default: 100,
        min: 1
    },
    passingScore: {
        type: Number,
        required: true,
        default: 60,
        min: 0
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'ended', 'cancelled'],
        default: 'draft'
    },
    isResultsPublished: {
        type: Boolean,
        default: false
    },
    autoPromoteOnPass: {
        type: Boolean,
        default: false
    },
    questions: {
        type: [questionSchema],
        default: []
    }
}, { timestamps: true })

module.exports = mongoose.model('Exam', examSchema)


const mongoose = require('mongoose')

const levelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    order: {
        type: Number,
        required: true,
        default: 1
    },
    passingScore: {
        type: Number,
        default: 60,
        min: 0,
        max: 100
    },
    requiredExamsCount: {
        type: Number,
        default: 1,
        min: 0
    },
    requirements: {
        type: String,
        default: '',
        trim: true
    },
    nextLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        default: null
    },
    autoPromoteOnPass: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Level', levelSchema)


const mongoose = require('mongoose')

const matnChapterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        default: 1
    },
    versesCount: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        trim: true,
        default: ''
    }
})

const matnSchema = new mongoose.Schema({
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
    level: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        default: null
    },
    chapters: {
        type: [matnChapterSchema],
        default: []
    },
    totalSections: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Matn', matnSchema)


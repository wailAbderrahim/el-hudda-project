const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({

    recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['announcement', 'evaluation', 'memorization', 'system', 'exam', 'level', 'matn'],
        required: true
    },
    link: {
        type: String,
        trim: true,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    }
},{ timestamps: true })

module.exports = mongoose.model('Notification',notificationSchema)
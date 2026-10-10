const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    firstName: {
        type: String,
        required: true,
        trim: true
    },

    lastName: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true,
        trim: true
    },

    dateOfBirth: {
        type: String,
        trim: true,
        default: null
    },

    placeOfBirth: {
        type: String,
        required: true,
        trim: true
    },

    municipalityOfBirth: {
        type: String,
        required: true,
        trim: true
    },

    educationLevel: {
        type: String,
        required: true,
        trim: true
    },

    currentLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
        default: null
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        default: 'student'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    verificationToken: {
        type: String
    },

    verificationTokenExpires: {
        type: Date
    },

    resetPasswordToken: {
        type: String
    },

    resetPasswordTokenExpires: {
        type: Date
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)
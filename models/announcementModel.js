const mongoose = require('mongoose')

const announcementSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true

    },
    content:{
        type:String,
        required:true
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true

    },
    isActive:{
        type:Boolean,
        default:true,
        
    },
    expiresAt:{
        type:Date,
    },


},{timestamps:true})

module.exports = mongoose.model('Announcement', announcementSchema)
const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
    halaqa:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Halaqa',
        required:true,

    },
    student:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    date:{
        type:Date,
        required:true,
    },
    status:{
        type:String,
        enum:['present', 'absent', 'late'],
        required:true,

    }

},{timestamps:true})

attendanceSchema.index(
    { halaqa: 1, student: 1, date: 1 },
    { unique: true }
)

module.exports = mongoose.model('Attendance', attendanceSchema)
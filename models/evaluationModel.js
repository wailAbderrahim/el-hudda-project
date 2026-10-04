const mongoose = require('mongoose')

const evaluationSchema = new mongoose.Schema({
    student:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    halaqa:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Halaqa',
        required:true
    },
    teacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true        
    },
    type:{
        type:String,
        enum:['memorization', 'recitation', 'tajweed'],
        required:true
    },
    score:{
        type:Number,
        required:true,
        min:0,
        max:10
    },
    notes:{
        type:String,

    },
    date:{
        type:Date,
        required:true
    }
},{timestamps:true})



module.exports = mongoose.model('Evaluation',evaluationSchema)
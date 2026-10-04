const  mongoose  = require("mongoose");

const memorizationSchema = new mongoose.Schema({
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
    surah:{
        type:String,
        required:true
    },
    fromVerse:{
        type:Number,
        required:true
    },
    toVerse:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        required:true
    }

},{timestamps:true})




module.exports = mongoose.model('Memorization',memorizationSchema)


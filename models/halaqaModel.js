const mongoose = require('mongoose')

const halaqaSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    teacher:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true    
    },
    students:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    schedule:{
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true   
    }
    

})

module.exports = mongoose.model('Halaqa', halaqaSchema)
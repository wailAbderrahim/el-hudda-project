const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const authMidllware = async (req,res,next)=>{

    try{
        const authHeader = req.headers.authorization

        if(!authHeader || !authHeader.startsWith('Bearer')){
            throw new Error('not authorized')
        }
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)  
        req.user = decoded
        const user = await userModel.findById(req.user.id).select('-password') 
        if(!user){
            throw new Error('not authorized')
        }
        req.user = user

        next() 
    }catch(err){
        console.log(err)
        res.status(401).json({
            message: 'not authorized'
        })
    }
    
}

module.exports = authMidllware
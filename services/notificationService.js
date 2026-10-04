const Notification = require('../models/notificationModel')
const User = require('../models/userModel')
const wsManager = require('../webSocket/webSocketManager')



const createNotification = async (notificationData)=>{
    if(!notificationData){
        throw new Error('notification data required')
    }

    const {recipient,title,message,type} = notificationData
    if(!recipient){
        throw new Error('recipient required')
    }
    const recipientData = await User.findById(recipient) 
    if(!recipientData){
        throw new Error('recipient not found')
    }
    if(!title){
        throw new Error('title required')
    }
    if(!message){
        throw new Error('message required')
    }
    const allowedTypes = ['announcement', 'evaluation', 'memorization', 'system']
    if(!type){
        throw new Error('type required')
    }
    if(!allowedTypes.includes(type)){
        throw new Error('type are not allowed')
    }
    const notification = await Notification.create({
        recipient,
        title,
        message,
        type
    })
    wsManager.sendToUser(recipient,notification)

    return notification
}

const getNotifications = async (userId)=>{
    if(!userId){
        throw new Error('user id required')
    }
    const notifications = await Notification.find({
        recipient : userId
    }).sort({ createdAt: -1 })

    return notifications
}

const getNotificationById = async (notificationId, userId) => {
    if(!notificationId || !userId){
        throw new Error('messing notification id or userId')
    }
    const notification = await Notification.findOne({
        _id:notificationId,
        recipient: userId
        
    })

    if(!notification){
        throw new Error(' notification not found')
    }
    return notification
}

const markUsRead = async (notificationId,userId)=>{
    if(!notificationId || !userId){
        throw new Error('messing notification id or userId')
    }
    const notification = await Notification.findOneAndUpdate({
        _id:notificationId,
        recipient: userId
        
    },
    {
        isRead:true
    },
    {new:true}
)
if(!notification){
    throw new Error('notification not found')
}
return notification
}



const markUsReadAll = async (userId)=>{
    if(!userId){
        throw new Error('messing userId')
    }
    const notifications = await Notification.updateMany({
        recipient: userId
        
    },
    {
        isRead:true
    },
    
)

return notifications
}



const deleteNotification = async (notificationId,userId)=>{
    if(!notificationId || !userId){
        throw new Error('messing notification id or userId')
    }
    const notification = await Notification.findOneAndDelete({
        _id:notificationId,
        recipient: userId
        
    },
)
if(!notification){
    throw new Error('notification not found')
}
return 'notification deleted'
}

module.exports = {
    createNotification,
    getNotifications,
    getNotificationById,
    markUsRead,
    markUsReadAll,
    deleteNotification
}
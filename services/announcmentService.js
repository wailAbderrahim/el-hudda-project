const Announcement = require('../models/announcementModel')
const notificationService = require('./notificationService')
const User = require('../models/userModel')


const createAnnounecement = async (announcemntData, user)=>{
    const {title, content, expiresAt} = announcemntData
    if(user.role !== 'admin'){
        throw new Error('you are not admin')
    }
    if(!title || !content){
        throw new Error('data required')
    }

    let newExpiresAt;

    if(expiresAt){
        newExpiresAt = new Date(expiresAt)
            if(isNaN(newExpiresAt.getTime())){
        throw new Error('invalid date')
    }
        newExpiresAt.setHours(0, 0, 0, 0)
    }


    const announcement = await Announcement.create({
        title,
        content,
        createdBy:user._id,
        expiresAt:newExpiresAt



    })
    const users = await User.find({
        role: { $in: ['student', 'teacher', 'admin'] }
    }).select('_id')
    for(const user of users){
        await notificationService.createNotification({
            recipient:user._id,
            title: 'New announcement',
            message: content,
            type: 'announcement'

        })
    }

    return announcement
}

const getAnnouncment = async (user) => {
    if (user && user.role === 'admin') {
        return await Announcement.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name')
    }

    const now = new Date()
    const announcements = await Announcement.find({
        isActive: true,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: now } }
        ]
    }).sort({ createdAt: -1 })
    .populate('createdBy', 'name')

    return announcements
}


const getAnnouncmentById = async (announcementId)=>{
    const announcement = await Announcement.findById(announcementId).populate('createdBy', 'name')
    if(!announcement){
        throw new Error('announcement not found')
    }
    return announcement
}


const updateAnnouncment = async(announcmenData, announcementId, user)=>{
    const {title, content, isActive, expiresAt} = announcmenData
    const announcment = await Announcement.findById(announcementId)
    if(!announcment){
        throw new Error('announcement not found')
    }
    if(user.role !== 'admin'){
        throw new Error('access denied')
    }
    const newTitle = title !== undefined ? title : announcment.title
    const newContent = content !== undefined ? content : announcment.content
    const newIsActive = isActive !== undefined ? isActive : announcment.isActive
    let newExpiresDate ;
    if(expiresAt === undefined){
        newExpiresDate = announcment.expiresAt
    }
    if(expiresAt === null){
        newExpiresDate = null
    }
    if(expiresAt){
        newExpiresDate = new Date(expiresAt)
        if(isNaN(newExpiresDate.getTime())){
            throw new Error('invalid date')
        }
        newExpiresDate.setHours(0, 0, 0, 0)
    }

    announcment.title = newTitle
    announcment.content = newContent
    announcment.isActive = newIsActive
    announcment.expiresAt = newExpiresDate

    await announcment.save()

    return announcment
}

const deleteAnnouncment = async(announcmentId, user)=>{
    const announcment = await Announcement.findById(announcmentId)
    if(!announcment){
        throw new Error('announcment not found')
    }
    if(user.role !== 'admin'){
        throw new Error('access denied')
    }
    await announcment.deleteOne()
    return 'announcment deleted successfully'
    
}

module.exports = {
    createAnnounecement,
    getAnnouncment,
    getAnnouncmentById,
    updateAnnouncment,
    deleteAnnouncment
}
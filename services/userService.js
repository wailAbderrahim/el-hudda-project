
const userModel = require('../models/userModel')
const bcrypt = require('bcryptjs')


const updateUserStatus = async (userId, isActive, currentUserId) => {

    if (typeof isActive !== 'boolean') {
        throw new Error('isActive must be a boolean')
    }

    if (
        userId.toString() === currentUserId.toString() &&
        isActive === false
    ) {
        throw new Error('You cannot deactivate your own account')
    }

    const user = await userModel
        .findByIdAndUpdate(
            userId,
            {
                isActive: isActive
            },
            {
                new: true,
                runValidators: true
            }
        )
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )

    if (!user) {
        throw new Error('User not found')
    }

    return user
}


const updateUser = async (userId, updateData) => {

    const {
        name,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        placeOfBirth,
        municipalityOfBirth,
        educationLevel,
        email,
        role,
        isVerified
    } = updateData


    const updatedUser = await userModel
        .findByIdAndUpdate(
            userId,
            {
                name,
                firstName,
                lastName,
                phone,
                dateOfBirth,
                placeOfBirth,
                municipalityOfBirth,
                educationLevel,
                email,
                role,
                isVerified
            },
            {
                new: true,
                runValidators: true
            }
        )
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )

    if (!updatedUser) {
        throw new Error('User not found')
    }

    return updatedUser
}


const getUserById = async (userId) => {

    const user = await userModel
        .findById(userId)
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )

    if (!user) {
        throw new Error('User not found')
    }

    return user
}


const getUsers = async () => {

    const users = await userModel
        .find()
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )

    return users
}


const updateUserProfile = async (userId, updateData) => {

    const {
        name,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        placeOfBirth,
        municipalityOfBirth,
        educationLevel,
        email
    } = updateData


    const updatedData = {
        name,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        placeOfBirth,
        municipalityOfBirth,
        educationLevel,
        email
    }


    const user = await userModel
        .findByIdAndUpdate(
            userId,
            updatedData,
            {
                new: true,
                runValidators: true
            }
        )
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )


    if (!user) {
        throw new Error('User not found')
    }

    return user
}

const getProfile = async (userId) => {
    const user = await userModel
        .findById(userId)
        .select(
            '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires'
        )

    if (!user) {
        throw new Error('User not found')
    }

    return user
}


const changePassword = async (
    userId,
    currentPassword,
    newPassword
) => {

    const user = await userModel.findById(userId)

    if (!user) {
        throw new Error('User not found')
    }


    const isMatch = await bcrypt.compare(
        currentPassword,
        user.password
    )


    if (!isMatch) {
        throw new Error('Current password is incorrect')
    }


    const hashedPassword = await bcrypt.hash(
        newPassword,
        10
    )


    user.password = hashedPassword

    await user.save()
}


module.exports = {
    updateUserProfile,
    changePassword,
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    getProfile
    
}
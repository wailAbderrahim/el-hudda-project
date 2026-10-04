const connectedUsers = new Map()

const addUser = (userId, socket)=>{
   return connectedUsers.set(userId,socket)
}

const removeUser = (userId)=>{
    return connectedUsers.delete(userId)
}

const sendToUser = (userId, data)=>{
    const connectedUSer =  connectedUsers.get(userId)
    if(connectedUSer){
        connectedUSer.send(JSON.stringify(data))
    }


}
module.exports = {
    addUser,
    removeUser,
    sendToUser
}
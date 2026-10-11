const connectedUsers = new Map()

const addUser = (userId, socket) => {
    if (!userId) return
    return connectedUsers.set(String(userId), socket)
}

const removeUser = (userId) => {
    if (!userId) return
    return connectedUsers.delete(String(userId))
}

const sendToUser = (userId, data) => {
    if (!userId) return
    const connectedUser = connectedUsers.get(String(userId))
    if (connectedUser && (connectedUser.readyState === undefined || connectedUser.readyState === 1)) {
        try {
            connectedUser.send(JSON.stringify(data))
        } catch (_) {}
    }
}

module.exports = {
    addUser,
    removeUser,
    sendToUser
}
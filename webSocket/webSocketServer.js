const WebSocket = require('ws')
const wsManager = require('./webSocketManager')

const dotenv = require('dotenv').config()
const jwt = require('jsonwebtoken')

const createWebSocketServer = server => {

    const webSocketServer = new WebSocket.Server({
        server: server
    })

    webSocketServer.on('connection', (socket, request) => {
        console.log('New client connected')

        const url = new URL(request.url, 'http://localhost:5000')
        const token = url.searchParams.get('token')

        console.log(token ? 'Token received' : 'No token')

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            console.log(decoded)

            const userId = decoded.id

            wsManager.addUser(userId, socket)

            socket.on('message', (message) => {
                console.log('Message received:', message.toString())
            })

            socket.on('close', () => {
                wsManager.removeUser(userId)
            })

        } catch (error) {
            console.log('WebSocket authentication failed')
            socket.close()
        }
    })
}

module.exports = createWebSocketServer
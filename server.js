require('dotenv').config()

const express = require('express')
const http = require('http')
const connectedDb = require('./config/db')
const cors = require('cors')

const authRoute = require('./routes/authRoute')
const userRoute = require('./routes/userRoutes')
const halaqaRoute = require('./routes/halqaRoute')
const attendanceRout = require('./routes/attendanceRoute')
const memorizationRout = require('./routes/memorizationRoute')
const evaluationRout = require('./routes/evaluationRoute')
const studentProgressRout = require('./routes/studentProgressRoute')
const announcementRoute = require('./routes/announcementRoute')
const webSocketServer = require('./webSocket/webSocketServer')
const notificationRoute = require('./routes/notificationRoute')
const dashboardRoute = require('./routes/dashboardRoute')
const reportRoute = require('./routes/reportsRoute')


connectedDb()


const app = express()


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
    'https://el-hudda.vercel.app',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5000',
    'http://localhost:5000',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL
].filter(Boolean)


app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without origin
            // such as Postman, server-to-server, or local tools
            if (!origin) {
                return callback(null, true)
            }

            const cleanOrigin = origin.replace(/\/+$/, '')
            const isAllowed = allowedOrigins.some(o => o.replace(/\/+$/, '') === cleanOrigin)

            if (isAllowed) {
                return callback(null, true)
            }

            return callback(
                new Error('Not allowed by CORS')
            )
        },

        credentials: true
    })
)


/* =========================================================
   Body Parser
========================================================= */

app.use(express.json())


/* =========================================================
   Routes
========================================================= */

app.use('/api/memorization', memorizationRout)
app.use('/api/auth', authRoute)
app.use('/api/user', userRoute)
app.use('/api/halaqa', halaqaRoute)
app.use('/api/attendance', attendanceRout)
app.use('/api/evaluation', evaluationRout)
app.use('/api/student-progress', studentProgressRout)
app.use('/api/announcements', announcementRoute)
app.use('/api/notifications', notificationRoute)
app.use('/api/dashboard', dashboardRoute)
app.use('/api/reports', reportRoute)


/* =========================================================
   Root
========================================================= */

app.get('/', (req, res) => {

    res.json({
        message: 'Quran School API is running'
    })

})


/* =========================================================
   HTTP Server
========================================================= */

const server = http.createServer(app)


/* =========================================================
   WebSocket
========================================================= */

webSocketServer(server)


/* =========================================================
   Port
========================================================= */

const PORT = process.env.PORT || 5000


server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    )

})
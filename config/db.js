const mongoose = require('mongoose')

const connectedDb = async () => {
    const maxRetries = 10
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const connection = await mongoose.connect(process.env.MONGO_URL, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
            })
            console.log(`MongoDB connected: ${connection.connection.host}`)
            return connection
        } catch (err) {
            console.error(`MongoDB connection attempt ${attempt} failed: ${err.message}`)
            if (attempt === maxRetries) {
                console.error('All MongoDB connection attempts exhausted.')
                break
            }
            await new Promise(res => setTimeout(res, 2000))
        }
    }
}

module.exports = connectedDb
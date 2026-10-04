const mongoose = require('mongoose')

const connectedDb = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URL)
        console.log(`MongoDB connected: ${connection.connection.host}`)
    }catch (err) {
        console.log(err.message)
    }
}

module.exports = connectedDb
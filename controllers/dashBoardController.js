const dashboardService = require('../services/dashBoardService')

const getDashboardStats = async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats()

        res.status(200).json(stats)
    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}

module.exports = {
    getDashboardStats
}
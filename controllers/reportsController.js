const reportService = require('../services/reportsService')


const getStudentsReport = async (req, res) => {
    try {
        const report = await reportService.getStudentsReport(
            req.params.id,
            req.user
        )

        res.status(200).json(report)

    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}




const getHalaqaReport = async (req, res) => {
    try {
        const report = await reportService.getHalaqaReport(
            req.params.id,
            req.user
        )

        res.status(200).json(report)

    } catch (error) {
        res.status(400).json({
            message: error.message
        })
    }
}



module.exports = {
    getStudentsReport,
    getHalaqaReport
}
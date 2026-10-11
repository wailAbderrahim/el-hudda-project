const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('../models/examModel');
const ExamAttempt = require('../models/examAttemptModel');

async function sync() {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('--- SYNCING EXAM AND ATTEMPT STATUSES ---');

    // 1. Reset uncorrected submitted attempts (gradedAt is null and gradedBy is null)
    const uncorrectedAttempts = await ExamAttempt.find({
        status: { $in: ['submitted', 'in_progress', 'grading'] },
        gradedAt: null,
        gradedBy: null
    });
    console.log(`Found ${uncorrectedAttempts.length} uncorrected attempts.`);
    for (const att of uncorrectedAttempts) {
        att.status = 'submitted';
        att.score = null;
        att.percentage = null;
        att.isPassed = null;
        await att.save();
        console.log(`  -> Reset attempt ${att._id} to score: null, status: 'submitted'`);
    }

    // 2. Synchronize exam.isResultsPublished
    const allExams = await Exam.find();
    console.log(`Auditing ${allExams.length} exams...`);

    for (const exam of allExams) {
        const attempts = await ExamAttempt.find({ exam: exam._id });
        const hasUncorrected = attempts.some(a => ['submitted', 'in_progress', 'grading'].includes(a.status));
        const allPublished = attempts.length > 0 && attempts.every(a => a.status === 'published');

        const prevPublished = exam.isResultsPublished;
        // If an exam has no attempts or has uncorrected attempts, results are NOT published!
        if (attempts.length === 0 || hasUncorrected || !allPublished) {
            exam.isResultsPublished = false;
        } else {
            exam.isResultsPublished = true;
        }

        if (prevPublished !== exam.isResultsPublished) {
            await exam.save();
            console.log(`  -> Exam "${exam.title}" (${exam._id}): isResultsPublished changed from ${prevPublished} to ${exam.isResultsPublished} (attempts: ${attempts.length}, hasUncorrected: ${hasUncorrected}, allPublished: ${allPublished})`);
        } else {
            console.log(`  -> Exam "${exam.title}" (${exam._id}): isResultsPublished remains ${exam.isResultsPublished} (attempts: ${attempts.length})`);
        }
    }

    console.log('--- SYNC COMPLETE ---');
    await mongoose.disconnect();
}

sync().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
});


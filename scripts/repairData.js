const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/userModel');
const Level = require('../models/levelModel');
const Exam = require('../models/examModel');
const ExamAttempt = require('../models/examAttemptModel');

async function repair() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('--- RUNNING DB REPAIR & SYNC ---');

    // 1. Ensure default level exists
    let defaultLevel = await Level.findOne({ order: 1 });
    if (!defaultLevel) {
        defaultLevel = await Level.findOne() || await Level.create({
            name: 'المستوى التمهيدي',
            order: 1,
            passingScore: 60,
            requiredExamsCount: 1,
            requirements: 'حفظ وتثبيت جزء عمّ وإتقان مبادئ القراءة التجويدية',
            isActive: true
        });
    }
    console.log('Default level:', defaultLevel.name, defaultLevel._id);

    // 2. Assign default level to all students missing currentLevel
    const unassignedStudents = await User.find({ role: 'student', currentLevel: null });
    console.log('Students needing level assignment:', unassignedStudents.length);
    for (const s of unassignedStudents) {
        s.currentLevel = defaultLevel._id;
        await s.save();
        console.log('Assigned level to student:', s.email);
    }

    // 3. Activate scheduled exams so students can see them immediately
    const scheduledExams = await Exam.find({ status: { $in: ['scheduled', 'draft'] } });
    console.log('Exams to activate:', scheduledExams.length);
    for (const ex of scheduledExams) {
        ex.status = 'active';
        await ex.save();
        console.log('Activated exam:', ex.title);
    }

    // 4. Update attempts: recalculate scores where needed
    const attempts = await ExamAttempt.find().populate('exam');
    for (const att of attempts) {
        if (!att.exam) continue;
        let total = 0;
        let scoredAnswers = 0;
        if (Array.isArray(att.answers)) {
            att.answers.forEach(a => {
                if (typeof a.score === 'number') {
                    total += a.score;
                    scoredAnswers++;
                }
            });
        }
        if (scoredAnswers > 0 && (!att.score || att.score === 0)) {
            att.score = total;
            att.totalScore = att.exam.totalScore || 100;
            att.percentage = Math.round((total / att.totalScore) * 100);
            att.isPassed = att.score >= (att.exam.passingScore || 60);
            await att.save();
            console.log('Updated attempt score for:', att._id, 'score:', att.score);
        }
    }

    console.log('--- REPAIR COMPLETE ---');
    await mongoose.disconnect();
}
repair().catch(err => { console.error(err); process.exit(1); });

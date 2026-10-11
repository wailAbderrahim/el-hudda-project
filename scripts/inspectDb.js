const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('../models/examModel');
const ExamAttempt = require('../models/examAttemptModel');

async function inspect() {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const exams = await Exam.find({}, 'title status isResultsPublished').lean();
  console.log(`--- EXAMS (${exams.length}) ---`);
  exams.forEach(e => {
    console.log(`ID: ${e._id}, Title: "${e.title}", Status: "${e.status}", isResultsPublished: ${e.isResultsPublished}`);
  });

  const attempts = await ExamAttempt.find({}, 'student exam status score gradedAt gradedBy isResultsPublished answers').lean();
  console.log(`--- ATTEMPTS (${attempts.length}) ---`);
  attempts.forEach(a => {
    const ansScored = (a.answers || []).filter(ans => typeof ans.score === 'number').length;
    console.log(`ID: ${a._id}, Exam: ${a.exam}, Status: "${a.status}", Score: ${a.score}, gradedAt: ${a.gradedAt}, gradedBy: ${a.gradedBy}, answersCount: ${(a.answers||[]).length}, scoredAnswers: ${ansScored}`);
  });

  process.exit(0);
}
inspect().catch(err => { console.error(err); process.exit(1); });

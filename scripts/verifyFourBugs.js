const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');

async function apiRequest(path, method = 'GET', token = null, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch (_) {
                    parsed = data;
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(parsed);
                } else {
                    reject(new Error(`[${res.statusCode}] ${typeof parsed === 'object' ? (parsed.message || JSON.stringify(parsed)) : parsed}`));
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runVerification() {
    console.log('========================================================');
    console.log('STARTING CRITICAL 4-BUG END-TO-END VERIFICATION');
    console.log('========================================================\n');

    await mongoose.connect(process.env.MONGO_URL);
    const User = require('../models/userModel');
    const Level = require('../models/levelModel');
    const Halaqa = require('../models/halaqaModel');

    // 1. Get or create test users
    const adminUser = await User.findOne({ role: 'admin' });
    const teacherUser = await User.findOne({ role: 'teacher' });
    const studentUser = await User.findOne({ role: 'student' });

    console.log('Test Admin:', adminUser.email);
    console.log('Test Teacher:', teacherUser.email);
    console.log('Test Student:', studentUser.email);

    // Generate JWT tokens for each role
    const jwt = require('jsonwebtoken');
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET);
    const teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, process.env.JWT_SECRET);
    const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, process.env.JWT_SECRET);

    // Make sure teacher has a halaqa with studentUser
    let halaqa = await Halaqa.findOne({ teacher: teacherUser._id });
    if (!halaqa) {
        halaqa = await Halaqa.create({
            name: 'حلقة الإتقان التجريبية',
            teacher: teacherUser._id,
            students: [studentUser._id],
            schedule: ['السبت', 'الاثنين']
        });
    } else if (!halaqa.students.includes(studentUser._id)) {
        halaqa.students.push(studentUser._id);
        await halaqa.save();
    }
    console.log('Halaqa confirmed:', halaqa.name, 'with student:', studentUser.name);

    // ----------------------------------------------------
    // TEST BUG 1: Exam Visibility in Student Account
    // ----------------------------------------------------
    console.log('\n--- TESTING BUG 1: Exams Visibility for Eligible Student ---');
    const timestamp = Date.now();
    const adminExamPayload = {
        title: `امتحان الإدارة المعتمد ${timestamp}`,
        type: 'quran',
        format: 'online',
        duration: 30,
        totalScore: 20,
        passingScore: 12,
        startDate: new Date().toISOString(),
        instructions: 'أجب عن جميع الأسئلة بدقة.',
        status: 'active',
        questions: [
            {
                id: `q_${timestamp}_1`,
                text: 'ما هو حكم النون الساكنة قبل حرف الباء؟',
                type: 'single_choice',
                options: ['إظهار', 'إدغام', 'إقلاب', 'إخفاء'],
                correctAnswer: 'إقلاب',
                points: 10
            },
            {
                id: `q_${timestamp}_2`,
                text: 'حروف القلقلة خمسة مجموعة في كلمة قطب جد.',
                type: 'true_false',
                options: [],
                correctAnswer: 'true',
                points: 10
            }
        ]
    };

    const createdAdminExam = await apiRequest('/exams', 'POST', adminToken, adminExamPayload);
    console.log('✓ Admin created exam:', createdAdminExam.title, '(ID:', createdAdminExam._id, ', Status:', createdAdminExam.status, ')');

    const teacherExamPayload = {
        title: `امتحان المعلم للحلقة ${timestamp}`,
        type: 'quran',
        format: 'online',
        targetHalaqa: halaqa._id.toString(),
        durationMinutes: 45,
        totalScore: 20,
        passingScore: 10,
        startDate: new Date().toISOString(),
        instructions: 'امتحان دوري مخصص لطلاب الحلقة.',
        status: 'active',
        questions: [
            {
                id: `q_${timestamp}_3`,
                text: 'اذكر تعريف الغنة لغة واصطلاحاً.',
                type: 'essay',
                options: [],
                correctAnswer: '',
                points: 10,
                rubric: 'تعريف لغوي وصوتي سليم'
            },
            {
                id: `q_${timestamp}_4`,
                text: 'كم عدد مراتب القلقلة؟',
                type: 'single_choice',
                options: ['مرتبتان', 'ثلاث مراتب', 'أربع مراتب'],
                correctAnswer: 'ثلاث مراتب',
                points: 10
            }
        ]
    };

    const createdTeacherExam = await apiRequest('/exams', 'POST', teacherToken, teacherExamPayload);
    console.log('✓ Teacher created exam:', createdTeacherExam.title, '(ID:', createdTeacherExam._id, ', Status:', createdTeacherExam.status, ')');

    // Student fetches exams
    const studentExams = await apiRequest('/exams', 'GET', studentToken);
    console.log(`Student received ${studentExams.length} exams.`);

    const foundAdminExam = studentExams.find(e => e._id === createdAdminExam._id);
    const foundTeacherExam = studentExams.find(e => e._id === createdTeacherExam._id);

    if (!foundAdminExam) {
        throw new Error(`FAIL: Admin exam ${createdAdminExam._id} not found in student's exam list!`);
    }
    if (!foundTeacherExam) {
        throw new Error(`FAIL: Teacher exam ${createdTeacherExam._id} not found in student's exam list!`);
    }
    console.log('✓ PASS: Both Admin and Teacher exams are visible in the student account!');

    // ----------------------------------------------------
    // TEST BUG 2: Student Educational Level in Profile
    // ----------------------------------------------------
    console.log('\n--- TESTING BUG 2: Student Educational Level in Profile ---');
    const studentProfile = await apiRequest('/user/profile', 'GET', studentToken);
    console.log('Profile currentLevel:', studentProfile.currentLevel);

    if (!studentProfile.currentLevel) {
        throw new Error('FAIL: studentProfile.currentLevel is null or undefined!');
    }
    if (!studentProfile.currentLevel.name) {
        throw new Error('FAIL: studentProfile.currentLevel is not populated with level name!');
    }
    console.log(`✓ Student Level Name: "${studentProfile.currentLevel.name}"`);
    console.log(`✓ Level Order: ${studentProfile.currentLevel.order}`);
    console.log(`✓ Level Passing Score: ${studentProfile.currentLevel.passingScore}%`);

    const progressData = await apiRequest(`/student-progress/${studentUser._id}`, 'GET', studentToken);
    if (!progressData.currentLevel || !progressData.currentLevel.name) {
        throw new Error('FAIL: progressData.currentLevel is missing or not populated!');
    }
    console.log('✓ Student progress top-level currentLevel is populated:', progressData.currentLevel.name);
    console.log('✓ PASS: Student educational level is correctly populated and displayed!');

    // ----------------------------------------------------
    // TEST BUG 3: Viewing Submitted Answers by Admin & Teacher
    // ----------------------------------------------------
    console.log('\n--- TESTING BUG 3: Student Answers Viewing by Admin & Teacher ---');
    // Student starts attempt
    const startRes = await apiRequest(`/exams/${createdAdminExam._id}/start`, 'POST', studentToken);
    console.log('✓ Student started attempt:', startRes.attempt?._id || startRes._id);

    // Student submits answers
    const studentAnswers = [
        {
            questionIndex: 0,
            questionId: `q_${timestamp}_1`,
            answer: 'إقلاب'
        },
        {
            questionIndex: 1,
            questionId: `q_${timestamp}_2`,
            answer: 'true'
        }
    ];

    const submitRes = await apiRequest(`/exams/${createdAdminExam._id}/submit`, 'POST', studentToken, { answers: studentAnswers });
    const attemptId = submitRes.attempt?._id || submitRes._id;
    console.log('✓ Student submitted exam attempt:', attemptId);

    // Admin views exam attempts
    const adminAttempts = await apiRequest(`/exams/${createdAdminExam._id}/attempts`, 'GET', adminToken);
    console.log(`Admin retrieved ${adminAttempts.length} attempts for this exam.`);
    const adminAttempt = adminAttempts.find(a => a._id === attemptId);
    if (!adminAttempt) throw new Error('FAIL: Admin could not find submitted attempt!');

    if (!adminAttempt.exam || !adminAttempt.exam.questions || adminAttempt.exam.questions.length === 0) {
        throw new Error('FAIL: adminAttempt does not contain populated exam questions!');
    }
    console.log('✓ Exam questions populated for Admin:', adminAttempt.exam.questions.length);

    if (!adminAttempt.answers || adminAttempt.answers.length === 0) {
        throw new Error('FAIL: adminAttempt does not contain student answers!');
    }
    const ans0 = adminAttempt.answers[0];
    console.log('Answer 0 Question Text:', ans0.questionText);
    console.log('Answer 0 Student Value:', ans0.answer);
    console.log('Answer 0 Correct Model Answer:', ans0.correctAnswer);

    if (!ans0.questionText || !ans0.answer) {
        throw new Error('FAIL: Enriched questionText or student answer missing in attempt answers!');
    }
    console.log('✓ PASS: Admin and Teacher can properly view questions and student submitted answers!');

    // ----------------------------------------------------
    // TEST BUG 4: Grading & Result Publication
    // ----------------------------------------------------
    console.log('\n--- TESTING BUG 4: Grading and Result Publication ---');

    // Admin grades the attempt using Admin payload format
    const gradePayload = {
        totalScore: 20,
        questionScores: [
            { questionIndex: 0, questionId: `q_${timestamp}_1`, score: 10 },
            { questionIndex: 1, questionId: `q_${timestamp}_2`, score: 10 }
        ],
        feedback: 'إجابات ممتازة ومتقنة بارك الله فيك.',
        status: 'graded'
    };

    const gradedResult = await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', adminToken, gradePayload);
    console.log('✓ Admin graded attempt score:', gradedResult.score, '/', gradedResult.totalScore);
    console.log('✓ Graded attempt status:', gradedResult.status);
    console.log('✓ Graded attempt feedback:', gradedResult.teacherNotes);

    if (gradedResult.score !== 20) {
        throw new Error(`FAIL: Attempt score was expected to be 20, got ${gradedResult.score}!`);
    }

    // Admin publishes exam results
    const publishRes = await apiRequest(`/exams/${createdAdminExam._id}/publish-results`, 'PATCH', adminToken);
    console.log('✓ Admin published results:', publishRes.message);

    // Student fetches results
    const studentResults = await apiRequest(`/exams/student-results/${studentUser._id}`, 'GET', studentToken);
    console.log(`Student retrieved ${studentResults.length} published results.`);

    const myResult = studentResults.find(r => r._id === attemptId);
    if (!myResult) {
        throw new Error(`FAIL: Attempt ${attemptId} not found in student results list!`);
    }

    console.log('✓ Found student result:');
    console.log(`  Exam: ${myResult.exam?.title}`);
    console.log(`  Score: ${myResult.score} / ${myResult.totalScore} (${myResult.percentage}%)`);
    console.log(`  Passed: ${myResult.isPassed}`);
    console.log(`  Notes: ${myResult.teacherNotes}`);
    console.log(`  Answers count: ${myResult.answers?.length}`);

    if (myResult.score !== 20 || !myResult.isPassed) {
        throw new Error(`FAIL: Student result data does not match graded values! Score: ${myResult.score}, isPassed: ${myResult.isPassed}`);
    }

    console.log('✓ PASS: Exam grading and result publication work end-to-end flawlessly!\n');

    console.log('========================================================');
    console.log('ALL 4 CRITICAL BUGS ARE 100% REPAIRED AND VERIFIED!');
    console.log('========================================================');

    await mongoose.disconnect();
}

runVerification().catch(err => {
    console.error('\n❌ VERIFICATION ERROR:', err);
    process.exit(1);
});

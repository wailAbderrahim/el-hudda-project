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
                    resolve({ status: res.statusCode, data: parsed });
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

async function run() {
    console.log('================================================================');
    console.log('RUNNING COMPREHENSIVE END-TO-END AUDIT & VERIFICATION SUITE');
    console.log('================================================================\n');

    let connected = false;
    for (let i = 1; i <= 5; i++) {
        try {
            await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
            connected = true;
            break;
        } catch (err) {
            console.log(`Connection attempt ${i} failed, retrying...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    if (!connected) throw new Error('Could not connect to MongoDB Atlas cluster');
    const User = require('../models/userModel');
    const Level = require('../models/levelModel');
    const Halaqa = require('../models/halaqaModel');
    const Exam = require('../models/examModel');
    const ExamAttempt = require('../models/examAttemptModel');
    const Notification = require('../models/notificationModel');
    const StudentLevelHistory = require('../models/studentLevelHistoryModel');
    const jwt = require('jsonwebtoken');

    // 1. Setup Users
    const adminUser = await User.findOne({ role: 'admin' });
    const teacherUser = await User.findOne({ role: 'teacher' });
    const studentUser = await User.findOne({ role: 'student' });

    if (!adminUser || !teacherUser || !studentUser) {
        throw new Error('Admin, Teacher, or Student user missing from DB.');
    }

    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET);
    const teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, process.env.JWT_SECRET);
    const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, process.env.JWT_SECRET);

    console.log('✓ Users authenticated:');
    console.log(`  - Admin:   ${adminUser.name || adminUser.email}`);
    console.log(`  - Teacher: ${teacherUser.name || teacherUser.email}`);
    console.log(`  - Student: ${studentUser.name || studentUser.email}`);

    // Ensure student is assigned to teacher's halaqa
    let halaqa = await Halaqa.findOne({ teacher: teacherUser._id });
    if (!halaqa) {
        halaqa = await Halaqa.create({
            name: 'حلقة التحقق والتدقيق',
            teacher: teacherUser._id,
            students: [studentUser._id],
            schedule: ['السبت']
        });
    } else if (!halaqa.students.some(s => s.toString() === studentUser._id.toString())) {
        halaqa.students.push(studentUser._id);
        await halaqa.save();
    }
    console.log(`✓ Halaqa confirmed: "${halaqa.name}"`);

    // Ensure educational levels exist for testing
    let lvl1 = await Level.findOne({ order: 1 });
    let lvl2 = await Level.findOne({ order: 2 });
    if (!lvl1) {
        lvl1 = await Level.create({ name: 'المستوى التمهيدي', order: 1, passingScore: 60 });
    }
    if (!lvl2) {
        lvl2 = await Level.create({ name: 'المستوى الأول', order: 2, passingScore: 70 });
    }
    if (!lvl1.nextLevel || lvl1.nextLevel.toString() !== lvl2._id.toString()) {
        lvl1.nextLevel = lvl2._id;
        await lvl1.save();
    }
    studentUser.currentLevel = lvl1._id;
    await studentUser.save();
    console.log(`✓ Student reset to initial level: "${lvl1.name}" (Order 1)`);

    // ----------------------------------------------------------------
    // TEST 1: End-to-End Exam Workflow with Subjective Validation & Immediate Publication
    // ----------------------------------------------------------------
    console.log('\n--- TEST 1: Creation, Submission, Subjective Check & Immediate Publish ---');
    const ts = Date.now();
    const examPayload = {
        title: `امتحان التجويد والإتقان ${ts}`,
        type: 'quran',
        format: 'online',
        duration: 25,
        totalScore: 20,
        passingScore: 12,
        startDate: new Date().toISOString(),
        instructions: 'أجب عن الأسئلة بدقة.',
        status: 'active',
        teacher: teacherUser._id,
        targetHalaqa: halaqa._id,
        questions: [
            {
                text: 'ما حكم الميم الساكنة عند حرف الباء؟',
                type: 'single_choice',
                points: 10,
                options: ['إظهار شفوي', 'إخفاء شفوي', 'إدغام شفوي', 'إقلاب'],
                correctAnswer: 'إخفاء شفوي'
            },
            {
                text: 'اشرح باختصار مراتب القلقلة مع ذكر مثال لكل مرتبة.',
                type: 'essay',
                points: 10,
                rubric: 'ذكر المراتب الثلاث (كبرى، وسطى، صغرى) بأمثلتها'
            }
        ]
    };

    const createRes = await apiRequest('/exams', 'POST', teacherToken, examPayload);
    const examId = createRes.data._id || createRes.data.id;
    console.log(`✓ 1.1 Exam created successfully: ID = ${examId}`);

    // Verify exam appears in student's account
    const studentExamsRes = await apiRequest('/exams', 'GET', studentToken);
    const foundExam = studentExamsRes.data.find(e => (e._id || e.id) === examId);
    if (!foundExam) throw new Error('FAIL: Exam not visible to target student!');
    console.log(`✓ 1.2 Exam visible in student account. (myAttempt = ${foundExam.myAttempt ? 'exists' : 'null'})`);

    // Student starts exam
    const startRes = await apiRequest(`/exams/${examId}/start`, 'POST', studentToken);
    const attemptId = startRes.data.attempt._id;
    console.log(`✓ 1.3 Student started exam. Attempt ID = ${attemptId}, status = "${startRes.data.attempt.status}"`);

    // Student submits answers (correct answer for Q0, text answer for Q1)
    const submitPayload = {
        answers: [
            { questionIndex: 0, answer: 'إخفاء شفوي' },
            { questionIndex: 1, answer: 'مراتب القلقلة: كبرى عند الوقف على المشدد، ووسطى عند الوقف على المخفف، وصغرى في الوصل.' }
        ]
    };
    const submitRes = await apiRequest(`/exams/${examId}/submit`, 'POST', studentToken, submitPayload);
    const submittedAttempt = submitRes.data.attempt;
    console.log(`✓ 1.4 Student submitted answers. Attempt status = "${submittedAttempt.status}"`);

    if (submittedAttempt.status !== 'submitted') {
        throw new Error(`FAIL: Attempt status should be "submitted" before grading, got: ${submittedAttempt.status}`);
    }

    // Verify results are NOT yet exposed to the student before teacher grades & publishes
    const preResultsRes = await apiRequest(`/exams/student-results/${studentUser._id}`, 'GET', studentToken);
    const prePublished = preResultsRes.data.find(r => (r.exam?._id || r.exam) === examId);
    if (prePublished) {
        throw new Error('SECURITY FAIL: Student was able to view result before official publication!');
    }
    console.log('✓ 1.5 Verified: Student cannot view unannounced preliminary result.');

    // Verify teacher sees attempt as "غير مصحح" (status = submitted)
    const teacherAttemptsRes = await apiRequest(`/exams/${examId}/attempts`, 'GET', teacherToken);
    const attInTeacherView = teacherAttemptsRes.data.find(a => (a._id || a.id) === attemptId);
    if (!attInTeacherView) throw new Error('FAIL: Attempt not listed in teacher view!');
    console.log(`✓ 1.6 Teacher attempts list retrieved: Attempt status = "${attInTeacherView.status}", isGraded = ${attInTeacherView.isGraded}`);

    // Try grading with missing subjective score -> Must fail with 400
    console.log('✓ 1.7 Testing subjective validation (attempting to publish without scoring essay question)...');
    let validationBlocked = false;
    try {
        await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', teacherToken, {
            scores: { 0: 10 }, // Q1 score omitted!
            publishImmediately: true
        });
    } catch (vErr) {
        validationBlocked = true;
        console.log(`  -> Correctly blocked by server: ${vErr.message}`);
    }
    if (!validationBlocked) {
        throw new Error('FAIL: Server allowed grading/publishing an exam with unscored subjective questions!');
    }

    // Now grade properly: 10 for Q0 (objective), 9 for Q1 (subjective) -> Total = 19/20
    console.log('✓ 1.8 Executing single-action: "تصحيح وإعلان النتيجة" (Grade & Publish)...');
    const gradeRes = await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', teacherToken, {
        scores: { 0: 10, 1: 9 },
        feedback: { 1: 'إجابة ممتازة ومكتملة بارك الله فيك.' },
        generalNotes: 'أداء متميز في التجويد العملي والنظري.',
        publishImmediately: true
    });

    const gradedAtt = gradeRes.data;
    console.log(`✓ 1.9 Grading result: status = "${gradedAtt.status}", score = ${gradedAtt.score}/${gradedAtt.totalScore}, percentage = ${gradedAtt.percentage}%, isPassed = ${gradedAtt.isPassed}`);

    if (gradedAtt.status !== 'published') {
        throw new Error(`FAIL: Attempt status should immediately transition to "published", got: ${gradedAtt.status}`);
    }
    if (gradedAtt.score !== 19) {
        throw new Error(`FAIL: Expected total score 19, got: ${gradedAtt.score}`);
    }

    // Verify student received the publication notification
    const studentNotifs = await Notification.find({ recipient: studentUser._id, type: 'exam' }).sort({ createdAt: -1 });
    const pubNotif = studentNotifs.find(n => n.title.includes('إعلان نتيجة') && n.message.includes(examPayload.title));
    if (!pubNotif) {
        throw new Error('FAIL: Student did not receive in-app notification for published exam result!');
    }
    console.log(`✓ 1.10 Student in-app notification verified: "${pubNotif.title}" - "${pubNotif.message}"`);

    // Verify student can now see published result in official results endpoint
    const postResultsRes = await apiRequest(`/exams/student-results/${studentUser._id}`, 'GET', studentToken);
    const publishedResult = postResultsRes.data.find(r => (r.exam?._id || r.exam) === examId);
    if (!publishedResult) {
        throw new Error('FAIL: Published result not found in student results!');
    }
    console.log(`✓ 1.11 Student results verified: Score = ${publishedResult.score}/${publishedResult.totalScore}, Status = "${publishedResult.status}"`);

    // ----------------------------------------------------------------
    // TEST 2: Level Transition Exam & Student Auto-Promotion
    // ----------------------------------------------------------------
    console.log('\n--- TEST 2: Level Transition Exam & Student Promotion ---');
    const levelExamPayload = {
        title: `امتحان ترقية إلى المستوى الأول ${ts}`,
        type: 'level',
        format: 'online',
        duration: 30,
        totalScore: 20,
        passingScore: 12,
        startDate: new Date().toISOString(),
        instructions: 'امتحان رسمي للترقية.',
        status: 'active',
        autoPromoteOnPass: true,
        targetLevel: lvl1._id, // Level 1 exam that promotes to Level 2
        questions: [
            {
                text: 'ما هو تعريف الإدغام لغة واصطلاحاً؟',
                type: 'single_choice',
                points: 20,
                options: ['الإدخال', 'البيان', 'القطع', 'الستر'],
                correctAnswer: 'الإدخال'
            }
        ]
    };

    const createLvlExamRes = await apiRequest('/exams', 'POST', adminToken, levelExamPayload);
    const lvlExamId = createLvlExamRes.data._id;
    console.log(`✓ 2.1 Level transition exam created: ID = ${lvlExamId}`);

    // Student takes level exam
    const startLvlRes = await apiRequest(`/exams/${lvlExamId}/start`, 'POST', studentToken);
    const lvlAttemptId = startLvlRes.data.attempt._id;

    // Student submits with correct answer (20/20)
    await apiRequest(`/exams/${lvlExamId}/submit`, 'POST', studentToken, {
        answers: [{ questionIndex: 0, answer: 'الإدخال' }]
    });
    console.log('✓ 2.2 Student submitted level transition exam.');

    // Admin grades and announces result
    await apiRequest(`/exams/attempts/${lvlAttemptId}/grade`, 'PUT', adminToken, {
        scores: { 0: 20 },
        publishImmediately: true
    });
    console.log('✓ 2.3 Admin graded and published level transition exam.');

    // Verify student was promoted in DB
    const refreshedStudent = await User.findById(studentUser._id);
    if (String(refreshedStudent.currentLevel) !== String(lvl2._id)) {
        throw new Error(`FAIL: Student currentLevel was not promoted! Expected ${lvl2._id}, got ${refreshedStudent.currentLevel}`);
    }
    console.log(`✓ 2.4 Verified: Student level successfully promoted in User record to "${lvl2.name}"`);

    // Verify StudentLevelHistory was logged
    const historyRecord = await StudentLevelHistory.findOne({ student: studentUser._id, exam: lvlExamId });
    if (!historyRecord) {
        throw new Error('FAIL: StudentLevelHistory record was not created!');
    }
    console.log(`✓ 2.5 Verified: StudentLevelHistory logged transition from ${historyRecord.previousLevel} to ${historyRecord.newLevel}`);

    // Verify Level Promotion Notification
    const lvlNotif = await Notification.findOne({ recipient: studentUser._id, type: 'level' }).sort({ createdAt: -1 });
    if (!lvlNotif) {
        throw new Error('FAIL: Level promotion notification not sent to student!');
    }
    console.log(`✓ 2.6 Verified: Promotion notification delivered: "${lvlNotif.title}" - "${lvlNotif.message}"`);

    // ----------------------------------------------------------------
    // TEST 3: Security & Access Control
    // ----------------------------------------------------------------
    console.log('\n--- TEST 3: Security & Access Control Verification ---');

    // 3.1 Student cannot grade attempt
    let studentGradeBlocked = false;
    try {
        await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', studentToken, { totalScore: 20 });
    } catch (sErr) {
        studentGradeBlocked = true;
        console.log(`✓ 3.1 Student blocked from grading attempt: ${sErr.message}`);
    }
    if (!studentGradeBlocked) throw new Error('SECURITY FAIL: Student was able to call grade endpoint!');

    // 3.2 Student cannot access another student's results
    let crossStudentBlocked = false;
    try {
        await apiRequest(`/exams/student-results/${adminUser._id}`, 'GET', studentToken);
    } catch (cErr) {
        crossStudentBlocked = true;
        console.log(`✓ 3.2 Student blocked from viewing another student's results: ${cErr.message}`);
    }
    if (!crossStudentBlocked) throw new Error('SECURITY FAIL: Student viewed another user results!');

    const otherTeacher = await User.create({
        name: 'أستاذ بديل للتحقق',
        firstName: 'أستاذ',
        lastName: 'بديل',
        phone: '0555000000',
        educationLevel: 'جامعي',
        placeOfBirth: 'الجزائر',
        municipalityOfBirth: 'الجزائر',
        email: `alt_teacher_${ts}@test.com`,
        password: 'password123',
        role: 'teacher'
    });
    const otherTeacherToken = jwt.sign({ id: otherTeacher._id, role: otherTeacher.role }, process.env.JWT_SECRET);

    let crossTeacherBlocked = false;
    try {
        await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', otherTeacherToken, { totalScore: 20 });
    } catch (tErr) {
        crossTeacherBlocked = true;
        console.log(`✓ 3.3 Unauthorized teacher blocked from grading another teacher's exam: ${tErr.message}`);
    }
    await User.findByIdAndDelete(otherTeacher._id);
    if (!crossTeacherBlocked) throw new Error('SECURITY FAIL: Cross-teacher grading was allowed!');

    console.log('\n================================================================');
    console.log('ALL VERIFICATION PHASES PASSED WITH 100% SUCCESS!');
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
});

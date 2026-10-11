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

async function verifyAll() {
    console.log('========================================================================');
    console.log('EL-HUDDA QURAN SCHOOL: DEEP LOGICAL INTEGRITY AUDIT & VERIFICATION');
    console.log('========================================================================\n');

    await mongoose.connect(process.env.MONGO_URL || process.env.MONGO_URI);
    const User = require('../models/userModel');
    const Level = require('../models/levelModel');
    const Halaqa = require('../models/halaqaModel');
    const Exam = require('../models/examModel');
    const ExamAttempt = require('../models/examAttemptModel');
    const Notification = require('../models/notificationModel');
    const jwt = require('jsonwebtoken');

    const adminUser = await User.findOne({ role: 'admin' });
    const teacherUser = await User.findOne({ role: 'teacher' });
    const studentUser = await User.findOne({ role: 'student' });

    if (!adminUser || !teacherUser || !studentUser) {
        throw new Error('Missing admin, teacher, or student in database.');
    }

    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET);
    const teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, process.env.JWT_SECRET);
    const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, process.env.JWT_SECRET);

    console.log('✓ Users Authenticated:');
    console.log(`  - Admin:   ${adminUser.name || adminUser.email} (${adminUser._id})`);
    console.log(`  - Teacher: ${teacherUser.name || teacherUser.email} (${teacherUser._id})`);
    console.log(`  - Student: ${studentUser.name || studentUser.email} (${studentUser._id})`);

    // Ensure student is in teacher's halaqa
    let halaqa = await Halaqa.findOne({ teacher: teacherUser._id });
    if (!halaqa) {
        halaqa = await Halaqa.create({
            name: 'حلقة التحقق والتدقيق',
            teacher: teacherUser._id,
            students: [studentUser._id],
            schedule: ['الأحد', 'الثلاثاء']
        });
    } else if (!halaqa.students.some(s => s.toString() === studentUser._id.toString())) {
        halaqa.students.push(studentUser._id);
        await halaqa.save();
    }
    console.log(`✓ Halaqa confirmed: "${halaqa.name}"`);

    // Setup levels: Level 1 (تمهيدي), Level 2 (أول)
    let lvl1 = await Level.findOne({ order: 1 });
    let lvl2 = await Level.findOne({ order: 2 });
    if (!lvl1) lvl1 = await Level.create({ name: 'المستوى التمهيدي', order: 1, passingScore: 60 });
    if (!lvl2) lvl2 = await Level.create({ name: 'المستوى الأول', order: 2, passingScore: 70 });
    lvl1.nextLevel = lvl2._id;
    await lvl1.save();

    studentUser.currentLevel = lvl1._id;
    await studentUser.save();
    console.log(`✓ Student assigned to initial level: "${lvl1.name}" (Order 1)`);

    // -------------------------------------------------------------------------
    // TEST SCENARIO 1: Creation of a New Exam
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 1: Create New Exam & Verify Initial Statuses ---');
    const ts = Date.now();
    const examPayload = {
        title: `امتحان التجويد والضبط العلمي ${ts}`,
        type: 'quran',
        format: 'online',
        duration: 30,
        totalScore: 20,
        passingScore: 12,
        startDate: new Date().toISOString(),
        instructions: 'أجب عن جميع الأسئلة بدقة.',
        status: 'active',
        teacher: teacherUser._id,
        targetHalaqa: halaqa._id,
        questions: [
            {
                text: 'ما هو حكم النون الساكنة عند حرف الراء؟',
                type: 'single_choice',
                points: 10,
                options: ['إظهار حلقي', 'إدغام بغير غنة', 'إخفاء حقيقي', 'إقلاب'],
                correctAnswer: 'إدغام بغير غنة'
            },
            {
                text: 'اذكر حروف الاستعلاء السبعة مع بيان مرتبة تفخيمها في كلمة "طين".',
                type: 'essay',
                points: 10,
                rubric: 'خص ضغط قظ، والمرتبة الخامسة (المكسور).'
            }
        ]
    };

    const createRes = await apiRequest('/exams', 'POST', teacherToken, examPayload);
    const examId = createRes.data._id || createRes.data.id;
    console.log(`✓ 1.1 Exam created successfully: ID = ${examId}`);

    // Verify DB record: isResultsPublished MUST be false!
    const dbExam = await Exam.findById(examId);
    if (dbExam.isResultsPublished !== false) {
        throw new Error(`CRITICAL FAILURE: Newly created exam has isResultsPublished = ${dbExam.isResultsPublished}, MUST be false!`);
    }
    console.log(`✓ 1.2 Verified DB Exam: status = "${dbExam.status}", isResultsPublished = ${dbExam.isResultsPublished}`);

    // Verify student sees exam as eligible, with NO results published, myAttempt = null
    const studentExamsRes = await apiRequest('/exams', 'GET', studentToken);
    const foundExamInStudent = studentExamsRes.data.find(e => (e._id || e.id) === examId);
    if (!foundExamInStudent) throw new Error('FAIL: Exam not visible to target student!');
    if (foundExamInStudent.myAttempt !== null) throw new Error('FAIL: myAttempt should be null before taking exam!');
    console.log('✓ 1.3 Verified Student View: Exam visible, myAttempt is null, results NOT published.');

    // -------------------------------------------------------------------------
    // TEST SCENARIO 2: Student Takes & Submits Exam
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Student Starts & Submits Exam ---');
    const startRes = await apiRequest(`/exams/${examId}/start`, 'POST', studentToken);
    const attemptId = startRes.data.attempt._id;
    console.log(`✓ 2.1 Student started attempt: ID = ${attemptId}, status = "${startRes.data.attempt.status}"`);

    // Student submits answers
    const submitPayload = {
        answers: [
            { questionIndex: 0, answer: 'إدغام بغير غنة' },
            { questionIndex: 1, answer: 'حروف الاستعلاء هي: خ، ص، ض، غ، ط، ق، ظ المجموعة في خص ضغط قظ. وتفخيم الطاء في طين في المرتبة الخامسة لأنه مكسور.' }
        ]
    };
    const submitRes = await apiRequest(`/exams/${examId}/submit`, 'POST', studentToken, submitPayload);
    const submittedAtt = submitRes.data.attempt;
    console.log(`✓ 2.2 Student submitted attempt: status = "${submittedAtt.status}"`);

    if (submittedAtt.status !== 'submitted') {
        throw new Error(`FAIL: Attempt status should be "submitted", got "${submittedAtt.status}"`);
    }

    // CRITICAL CHECK: In student's exam list, student MUST NOT see a published result or score!
    const postSubmitStudentExams = await apiRequest('/exams', 'GET', studentToken);
    const studentExamAfterSubmit = postSubmitStudentExams.data.find(e => (e._id || e.id) === examId);
    if (!studentExamAfterSubmit || !studentExamAfterSubmit.myAttempt) {
        throw new Error('FAIL: myAttempt missing in student exams list after submission!');
    }
    if (studentExamAfterSubmit.myAttempt.score !== null) {
        throw new Error(`CRITICAL FAILURE: Student can see uncorrected score (${studentExamAfterSubmit.myAttempt.score}) before official publication!`);
    }
    if (studentExamAfterSubmit.myAttempt.status !== 'submitted') {
        throw new Error(`CRITICAL FAILURE: Attempt status in student view is "${studentExamAfterSubmit.myAttempt.status}", expected "submitted"!`);
    }
    console.log('✓ 2.3 Verified Student Exams: myAttempt.status = "submitted", score = null (NOT exposed).');

    // CRITICAL CHECK: Official student results list MUST NOT contain uncorrected attempt!
    const studentResultsRes = await apiRequest(`/exams/student-results/${studentUser._id}`, 'GET', studentToken);
    const leakResult = studentResultsRes.data.find(r => (r.exam?._id || r.exam) === examId);
    if (leakResult) {
        throw new Error('CRITICAL FAILURE: Uncorrected attempt appeared in student official results list!');
    }
    console.log('✓ 2.4 Verified Official Results: Unannounced attempt is hidden from student results tab.');

    // CRITICAL CHECK: Teacher attempts list MUST display attempt as UNGRADED ("غير مصحح", isGraded = false)
    const teacherAttemptsRes = await apiRequest(`/exams/${examId}/attempts`, 'GET', teacherToken);
    const attInTeacherView = teacherAttemptsRes.data.find(a => (a._id || a.id) === attemptId);
    if (!attInTeacherView) throw new Error('FAIL: Attempt missing from teacher view!');
    if (attInTeacherView.isGraded !== false) {
        throw new Error(`CRITICAL FAILURE: Submitted attempt has isGraded = ${attInTeacherView.isGraded}, MUST be false!`);
    }
    if (attInTeacherView.status !== 'submitted') {
        throw new Error(`FAIL: Attempt status in teacher view should be "submitted", got "${attInTeacherView.status}"`);
    }
    console.log(`✓ 2.5 Verified Teacher Attempts View: status = "${attInTeacherView.status}", isGraded = ${attInTeacherView.isGraded} (Correctly marked غير مصحح!).`);

    // Verify teacher can view student's submitted answers properly
    if (!Array.isArray(attInTeacherView.answers) || attInTeacherView.answers.length !== 2) {
        throw new Error('FAIL: Teacher cannot view student answers properly!');
    }
    console.log(`✓ 2.6 Verified Teacher can view student answers: Q0 ans = "${attInTeacherView.answers[0].answer}", Q1 ans = "${attInTeacherView.answers[1].answer.substring(0, 30)}..."`);

    // -------------------------------------------------------------------------
    // TEST SCENARIO 3: Subjective Question Validation
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Validation of Subjective Question Marks ---');
    let validationPassed = false;
    try {
        await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', teacherToken, {
            scores: { 0: 10 }, // Q1 score omitted!
            publishImmediately: true
        });
    } catch (valErr) {
        validationPassed = true;
        console.log(`✓ 3.1 Subjective validation blocked publication without grading: "${valErr.message}"`);
    }
    if (!validationPassed) {
        throw new Error('CRITICAL FAILURE: Server permitted publishing with ungraded subjective question!');
    }

    // -------------------------------------------------------------------------
    // TEST SCENARIO 4: Single-Action Grade & Publish
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Grade, Save, and Publish Immediately ---');
    const gradeRes = await apiRequest(`/exams/attempts/${attemptId}/grade`, 'PUT', teacherToken, {
        scores: { 0: 10, 1: 10 },
        feedback: { 1: 'إجابة نموذجية ممتازة أحسنت يا بطل.' },
        generalNotes: 'إتقان تام لأحكام النون الساكنة والاستعلاء.',
        publishImmediately: true
    });
    const gradedAttempt = gradeRes.data;
    console.log(`✓ 4.1 Graded attempt: status = "${gradedAttempt.status}", score = ${gradedAttempt.score}/${gradedAttempt.totalScore}, percentage = ${gradedAttempt.percentage}%, isPassed = ${gradedAttempt.isPassed}`);

    if (gradedAttempt.status !== 'published') {
        throw new Error(`FAIL: Graded attempt status should be "published", got "${gradedAttempt.status}"`);
    }
    if (gradedAttempt.score !== 20) {
        throw new Error(`FAIL: Expected total score 20, got ${gradedAttempt.score}`);
    }

    // Verify teacher attempts list now shows isGraded = true, status = 'published'
    const postGradeTeacherAttempts = await apiRequest(`/exams/${examId}/attempts`, 'GET', teacherToken);
    const gradedInTeacherView = postGradeTeacherAttempts.data.find(a => (a._id || a.id) === attemptId);
    if (!gradedInTeacherView.isGraded) {
        throw new Error('FAIL: Graded attempt should have isGraded = true in teacher view!');
    }
    if (gradedInTeacherView.status !== 'published') {
        throw new Error(`FAIL: Graded attempt should have status = "published", got "${gradedInTeacherView.status}"`);
    }
    console.log('✓ 4.2 Verified Teacher View after grading: isGraded = true, status = "published" (مصحح ومعلن).');

    // Verify student receives in-app notification
    const studentNotifs = await Notification.find({ recipient: studentUser._id, type: 'exam' }).sort({ createdAt: -1 });
    const pubNotif = studentNotifs.find(n => n.title.includes('إعلان نتيجة') && n.message.includes(examPayload.title));
    if (!pubNotif) {
        throw new Error('FAIL: Student did not receive exam result publication notification!');
    }
    console.log(`✓ 4.3 Verified Student Notification: "${pubNotif.title}" - "${pubNotif.message}"`);

    // Verify student can now see published result in official results endpoint
    const postGradeStudentResults = await apiRequest(`/exams/student-results/${studentUser._id}`, 'GET', studentToken);
    const pubResult = postGradeStudentResults.data.find(r => (r.exam?._id || r.exam) === examId);
    if (!pubResult) {
        throw new Error('FAIL: Published result missing from student results endpoint!');
    }
    if (pubResult.score !== 20 || !pubResult.isPassed) {
        throw new Error(`FAIL: Inaccurate published result data: score = ${pubResult.score}, isPassed = ${pubResult.isPassed}`);
    }
    console.log(`✓ 4.4 Verified Student Results Endpoint: Score = ${pubResult.score}/${pubResult.totalScore}, Status = "${pubResult.status}" (Successfully published!).`);

    // Verify student exam list now shows score and published status
    const postGradeStudentExams = await apiRequest('/exams', 'GET', studentToken);
    const studentExamAfterGrading = postGradeStudentExams.data.find(e => (e._id || e.id) === examId);
    if (!studentExamAfterGrading.myAttempt || studentExamAfterGrading.myAttempt.score !== 20) {
        throw new Error('FAIL: Student exam list does not reflect published score 20!');
    }
    if (studentExamAfterGrading.myAttempt.status !== 'published') {
        throw new Error(`FAIL: Student attempt status is "${studentExamAfterGrading.myAttempt.status}", expected "published"!`);
    }
    console.log('✓ 4.5 Verified Student Exams View: myAttempt.status = "published", score = 20.');

    // -------------------------------------------------------------------------
    // TEST SCENARIO 5: Level Transition Exam & Auto-Promotion
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Level Transition Exam & Auto-Promotion ---');
    const levelExamPayload = {
        title: `امتحان ترقية معتمد إلى المستوى الأول ${ts}`,
        type: 'level',
        format: 'online',
        duration: 20,
        totalScore: 20,
        passingScore: 12,
        startDate: new Date().toISOString(),
        instructions: 'امتحان تحديد واجتياز المستوى.',
        status: 'active',
        teacher: teacherUser._id,
        targetLevel: lvl1._id,
        autoPromoteOnPass: true,
        questions: [
            {
                text: 'سؤال الترقية: كم عدد مخارج الحروف العامة؟',
                type: 'single_choice',
                points: 20,
                options: ['3', '5', '7', '17'],
                correctAnswer: '5'
            }
        ]
    };

    const lvlExamRes = await apiRequest('/exams', 'POST', teacherToken, levelExamPayload);
    const lvlExamId = lvlExamRes.data._id || lvlExamRes.data.id;
    console.log(`✓ 5.1 Level exam created: ID = ${lvlExamId}`);

    // Student starts and submits level exam
    const lvlStartRes = await apiRequest(`/exams/${lvlExamId}/start`, 'POST', studentToken);
    const lvlAttId = lvlStartRes.data.attempt._id;
    await apiRequest(`/exams/${lvlExamId}/submit`, 'POST', studentToken, {
        answers: [{ questionIndex: 0, answer: '5' }]
    });
    console.log(`✓ 5.2 Student submitted level transition attempt: ID = ${lvlAttId}`);

    // Teacher grades and publishes level transition attempt
    await apiRequest(`/exams/attempts/${lvlAttId}/grade`, 'PUT', teacherToken, {
        scores: { 0: 20 },
        publishImmediately: true
    });
    console.log('✓ 5.3 Teacher graded and published level transition exam.');

    // Verify Student is now promoted to Level 2 (المستوى الأول)
    const updatedStudent = await User.findById(studentUser._id).populate('currentLevel');
    if (!updatedStudent.currentLevel || updatedStudent.currentLevel.order !== 2) {
        throw new Error(`FAIL: Student was not promoted to Level 2! Current level order = ${updatedStudent.currentLevel?.order}`);
    }
    console.log(`✓ 5.4 Verified Student Auto-Promotion: Student current level is now "${updatedStudent.currentLevel.name}" (Order 2).`);

    // Verify student profile API returns populated level
    const profileRes = await apiRequest('/users/profile', 'GET', studentToken);
    const profLevel = profileRes.data.currentLevel;
    if (!profLevel || profLevel.order !== 2) {
        throw new Error(`FAIL: /api/users/profile does not reflect promoted level order 2!`);
    }
    console.log(`✓ 5.5 Verified Profile API: currentLevel is populated with "${profLevel.name}" (Order ${profLevel.order}).`);

    console.log('\n========================================================================');
    console.log('ALL 5 END-TO-END SCENARIOS VERIFIED SUCCESSFULLY WITH 100% PASS RATE!');
    console.log('========================================================================\n');
    await mongoose.disconnect();
}

verifyAll().catch(err => {
    console.error('\n❌ VERIFICATION SUITE FAILED:', err);
    process.exit(1);
});

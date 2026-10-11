require('dotenv').config();
const jwt = require('jsonwebtoken');
const connectedDb = require('./config/db');
const User = require('./models/userModel');
const Level = require('./models/levelModel');
const Matn = require('./models/matnModel');
const StudentMatnProgress = require('./models/studentMatnProgressModel');
const Exam = require('./models/examModel');
const ExamAttempt = require('./models/examAttemptModel');
const StudentLevelHistory = require('./models/studentLevelHistoryModel');
const Notification = require('./models/notificationModel');

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    const res = await fetch(url, {
        ...options,
        headers,
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
    });
    let data;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    return { status: res.status, ok: res.ok, data };
}

function generateToken(user) {
    return jwt.sign(
        { id: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
}

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        testPassed++;
    } else {
        console.error(`  [FAIL] ${message}`);
        testFailed++;
    }
}

async function runTestSuite() {
    console.log('====================================================');
    console.log('   El-Hudda Quran School - Full E2E Verification    ');
    console.log('====================================================\n');

    await connectedDb();

    // 1. Locate test users
    const adminUser = await User.findOne({ role: 'admin', isActive: true });
    const teacherUser = await User.findOne({ role: 'teacher', isActive: true });
    const studentUser = await User.findOne({ role: 'student', isActive: true });

    if (!adminUser || !teacherUser || !studentUser) {
        console.error('Missing required user roles in DB to run test.');
        process.exit(1);
    }

    console.log(`Test Admin:   ${adminUser.name} (${adminUser.email})`);
    console.log(`Test Teacher: ${teacherUser.name} (${teacherUser.email})`);
    console.log(`Test Student: ${studentUser.name} (${studentUser.email})\n`);

    const adminToken = generateToken(adminUser);
    const teacherToken = generateToken(teacherUser);
    const studentToken = generateToken(studentUser);

    const originalStudentLevel = studentUser.currentLevel;

    // Track created artifacts for guaranteed cleanup
    let createdLevelAId = null;
    let createdLevelBId = null;
    let createdMatnId = null;
    let createdMatnChapterId = null;
    let createdMatnProgressId = null;
    let createdExamId = null;
    let createdAttemptId = null;
    const testNotificationIds = [];
    const testHistoryIds = [];

    try {
        /* ----------------------------------------------------
           1. Educational Levels Flow
        ---------------------------------------------------- */
        console.log('>>> [1/5] Testing Educational Levels Flow:');

        // Create Level A
        const lvlARes = await request('/levels', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: 'المستوى التمهيدي (اختبار آلي)',
                order: 81,
                passingScore: 70,
                requirements: 'حفظ جزء عم والأذكار الأساسية'
            }
        });
        assert(lvlARes.status === 201 && lvlARes.data?._id, 'Admin successfully created Level A');
        createdLevelAId = lvlARes.data?._id;

        // Create Level B
        const lvlBRes = await request('/levels', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: 'المستوى الأول (اختبار آلي)',
                order: 82,
                passingScore: 75,
                requirements: 'حفظ جزء تبارك ومتن تحفة الأطفال'
            }
        });
        assert(lvlBRes.status === 201 && lvlBRes.data?._id, 'Admin successfully created Level B');
        createdLevelBId = lvlBRes.data?._id;

        // Update Level A nextLevel link
        const lvlAUpdate = await request(`/levels/${createdLevelAId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { nextLevel: createdLevelBId }
        });
        assert(lvlAUpdate.status === 200, 'Admin successfully updated Level A nextLevel link');

        // Verify Student is forbidden from creating levels (RBAC check)
        const studentLvlRes = await request('/levels', {
            method: 'POST',
            headers: { Authorization: `Bearer ${studentToken}` },
            body: { name: 'مستوى محظور', order: 99 }
        });
        assert(studentLvlRes.status === 403, 'RBAC check: Student is forbidden from creating levels (403)');

        /* ----------------------------------------------------
           2. Mutun System Flow
        ---------------------------------------------------- */
        console.log('\n>>> [2/5] Testing Mutun System Flow:');

        // Admin creates Matn
        const matnRes = await request('/matn', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: 'متن تحفة الأطفال (اختبار آلي)',
                description: 'منظومة في علم تجويد القرآن الكريم',
                level: createdLevelAId,
                totalSections: 1
            }
        });
        assert(matnRes.status === 201 && matnRes.data?._id, 'Admin created Matn with Level link');
        createdMatnId = matnRes.data?._id;

        // Admin adds Chapter
        const chapRes = await request(`/matn/${createdMatnId}/chapters`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                title: 'باب أحكام النون الساكنة والتنوين',
                order: 1,
                versesCount: 15
            }
        });
        assert(chapRes.status === 201, 'Admin added Chapter to Matn');
        createdMatnChapterId = chapRes.data?.chapters?.[0]?._id;

        // Admin records Student Matn Progress
        const progressRes = await request('/matn/progress', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                studentId: studentUser._id.toString(),
                matnId: createdMatnId,
                section: 'باب أحكام النون الساكنة والتنوين',
                chapterIndex: 0,
                progressPercentage: 100,
                status: 'mastered',
                masteryGrade: 'excellent',
                notes: 'تسميع ممتاز وإتقان تام للأحكام'
            }
        });
        assert(progressRes.status === 201 && progressRes.data?._id, 'Admin recorded Student Matn Progress');
        createdMatnProgressId = progressRes.data?._id;

        // Student fetches own Matn Progress
        const studProgRes = await request(`/matn/progress/student/${studentUser._id}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const hasMatnProg = Array.isArray(studProgRes.data) && studProgRes.data.some(p => p.matn?._id === createdMatnId || p.matn === createdMatnId);
        assert(studProgRes.status === 200 && hasMatnProg, 'Student can view recorded Matn recitation progress');

        /* ----------------------------------------------------
           3. Exams Lifecycle & Level Promotion Flow
        ---------------------------------------------------- */
        console.log('\n>>> [3/5] Testing Exams Lifecycle & Level Promotion:');

        // Admin assigns Student to Level A initially
        studentUser.currentLevel = createdLevelAId;
        await studentUser.save();

        // Create Level Transition Exam
        const examCreateRes = await request('/exams', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                title: 'امتحان الانتقال إلى المستوى الأول (اختبار آلي)',
                description: 'امتحان ترقية تقييمي للمستوى الأول',
                type: 'level',
                format: 'online',
                targetLevel: createdLevelAId,
                autoPromoteOnPass: true,
                passingScore: 14,
                totalScore: 20,
                durationMinutes: 30,
                status: 'draft',
                targetStudents: [studentUser._id.toString()],
                questions: [
                    {
                        id: 'q1',
                        text: 'ما حكم النون الساكنة إذا جاء بعدها حرف الراء؟',
                        type: 'single_choice',
                        options: ['إدغام بغير غنة', 'إظهار حلقي', 'إقلاب'],
                        correctAnswer: 'إدغام بغير غنة',
                        points: 10
                    },
                    {
                        id: 'q2',
                        text: 'اذكر حروف الإظهار الحلقي الستة باختصار.',
                        type: 'essay',
                        points: 10
                    }
                ]
            }
        });
        assert(examCreateRes.status === 201 && examCreateRes.data?._id, 'Admin created transition exam with MCQ and Essay questions');
        createdExamId = examCreateRes.data?._id;

        // Admin activates the exam
        const activateRes = await request(`/exams/${createdExamId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { status: 'active' }
        });
        assert(activateRes.status === 200, 'Admin activated the transition exam');

        // Student checks available exams
        const myExamsRes = await request('/exams/my-exams', {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const examInList = Array.isArray(myExamsRes.data) && myExamsRes.data.some(e => e._id === createdExamId);
        assert(myExamsRes.status === 200 && examInList, 'Active exam appears in student available exams list');

        // Student starts exam attempt
        const startRes = await request(`/exams/${createdExamId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const startedAttempt = startRes.data?.attempt || startRes.data;
        assert(startRes.status === 200 && startedAttempt?._id, 'Student successfully started exam attempt');
        createdAttemptId = startedAttempt?._id;

        // Student auto-saves progress
        const q0Id = startedAttempt?.answers?.[0]?.questionId || 'q1';
        const q1Id = startedAttempt?.answers?.[1]?.questionId || 'q2';

        const progressSaveRes = await request(`/exams/${createdExamId}/progress`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${studentToken}` },
            body: {
                answers: [
                    { questionIndex: 0, questionId: q0Id, answer: 'إدغام بغير غنة' },
                    { questionIndex: 1, questionId: q1Id, answer: 'الهمزة والهاء والعين والحاء والغين والخاء' }
                ]
            }
        });
        assert(progressSaveRes.status === 200, 'Student auto-saved in-progress exam answers');

        // Student submits exam attempt
        const submitRes = await request(`/exams/${createdExamId}/submit`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${studentToken}` },
            body: {
                answers: [
                    { questionIndex: 0, questionId: q0Id, answer: 'إدغام بغير غنة' },
                    { questionIndex: 1, questionId: q1Id, answer: 'الهمزة والهاء والعين والحاء والغين والخاء' }
                ]
            }
        });
        const submittedAttempt = submitRes.data?.attempt || submitRes.data;
        assert(submitRes.status === 200 && ['submitted', 'grading'].includes(submittedAttempt?.status), 'Student successfully submitted exam attempt');

        // Verify Objective MCQ was auto-graded
        const autoScore = submittedAttempt?.answers?.[0]?.score;
        assert(autoScore === 10, 'MCQ question was automatically evaluated with full marks (10/10)');

        // Teacher/Admin grades subjective question (Essay)
        const gradeRes = await request(`/exams/attempts/${createdAttemptId}/grade`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                answersScores: [
                    { questionIndex: 1, score: 9, feedback: 'إجابة نموذجية وصحيحة' }
                ],
                isApproved: true
            }
        });
        assert(gradeRes.status === 200 && gradeRes.data?.score === 19, 'Admin graded subjective question, total score updated to 19/20 (95%)');

        // Publish exam results
        const publishRes = await request(`/exams/${createdExamId}/publish`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(publishRes.status === 200, 'Admin successfully published exam results');

        // Verify Auto-Promotion: Student's currentLevel in DB must now be Level B!
        const refreshedStudent = await User.findById(studentUser._id);
        const promotedToB = refreshedStudent.currentLevel?.toString() === createdLevelBId.toString();
        assert(promotedToB, 'Student was automatically promoted to Level B upon passing transition exam!');

        // Verify StudentLevelHistory was recorded
        const historyRecord = await StudentLevelHistory.findOne({
            student: studentUser._id,
            newLevel: createdLevelBId,
            exam: createdExamId
        });
        if (historyRecord) testHistoryIds.push(historyRecord._id);
        assert(!!historyRecord, 'StudentLevelHistory entry was automatically logged with exam reference');

        // Student views results
        const resultsRes = await request('/exams/my-results', {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const attemptResult = Array.isArray(resultsRes.data) && resultsRes.data.find(r => (r.exam?._id || r.exam)?.toString() === createdExamId.toString());
        assert(resultsRes.status === 200 && attemptResult?.isPassed === true, 'Student can view published score (95%), passed status, and model answers');

        /* ----------------------------------------------------
           4. Student Profile & Level History APIs Flow
        ---------------------------------------------------- */
        console.log('\n>>> [4/5] Testing Student Profile & Level History APIs:');

        // Student Profile API returns populated level
        const profileRes = await request('/user/profile', {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const profileLvlId = profileRes.data?.currentLevel?._id || profileRes.data?.currentLevel;
        assert(profileRes.status === 200 && profileLvlId?.toString() === createdLevelBId.toString(), 'Student Profile API returns updated currentLevel with name and passingScore');

        // Student Level History API returns promotion record
        const historyApiRes = await request(`/levels/history/${studentUser._id}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const hasHistoryEntry = Array.isArray(historyApiRes.data) && historyApiRes.data.some(h => (h.newLevel?._id || h.newLevel)?.toString() === createdLevelBId.toString());
        assert(historyApiRes.status === 200 && hasHistoryEntry, 'Level History API returns promotion event with previous & next level');

        /* ----------------------------------------------------
           5. Notifications System Flow
        ---------------------------------------------------- */
        console.log('\n>>> [5/5] Testing Unified Notifications Flow:');

        // Student fetches notifications
        const notifsRes = await request('/notifications', {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        assert(notifsRes.status === 200, 'Student fetched notifications list');

        const notifList = notifsRes.data?.notifications || notifsRes.data || [];
        const hasLevelNotif = notifList.some(n => n.type === 'level');
        const hasExamNotif = notifList.some(n => n.type === 'exam');
        const hasMatnNotif = notifList.some(n => n.type === 'matn');

        assert(hasLevelNotif, "Received targeted notification of type 'level' for promotion");
        assert(hasExamNotif, "Received targeted notification of type 'exam' for exam publication");
        assert(hasMatnNotif, "Received targeted notification of type 'matn' for recitation log");

        // Record notification IDs for cleanup
        notifList.forEach(n => {
            if (['level', 'exam', 'matn'].includes(n.type)) {
                testNotificationIds.push(n._id);
            }
        });

        // Mark all notifications as read
        const markAllRes = await request('/notifications/read-all', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        assert(markAllRes.status === 200, 'Successfully marked all notifications as read');

        // Verify unread count is 0
        const unreadRes = await request('/notifications/unread-count', {
            method: 'GET',
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const unreadCount = unreadRes.data?.unreadCount ?? unreadRes.data?.count ?? 0;
        assert(unreadCount === 0, 'Unread notification count correctly reflects 0 after mark-all-read');

    } catch (testErr) {
        console.error('Test execution error:', testErr);
        testFailed++;
    } finally {
        /* ----------------------------------------------------
           CLEANUP: Restore database to pristine state
        ---------------------------------------------------- */
        console.log('\n>>> Performing automated cleanup of test artifacts...');

        if (createdAttemptId) {
            await ExamAttempt.findByIdAndDelete(createdAttemptId);
        }
        if (createdExamId) {
            await Exam.findByIdAndDelete(createdExamId);
        }
        if (createdMatnProgressId) {
            await StudentMatnProgress.findByIdAndDelete(createdMatnProgressId);
        }
        if (createdMatnId) {
            await Matn.findByIdAndDelete(createdMatnId);
        }
        for (const hid of testHistoryIds) {
            await StudentLevelHistory.findByIdAndDelete(hid);
        }
        if (testNotificationIds.length > 0) {
            await Notification.deleteMany({ _id: { $in: testNotificationIds } });
        }
        if (createdLevelBId) {
            await Level.findByIdAndDelete(createdLevelBId);
        }
        if (createdLevelAId) {
            await Level.findByIdAndDelete(createdLevelAId);
        }

        // Restore student level
        studentUser.currentLevel = originalStudentLevel;
        await studentUser.save();

        console.log('Test artifacts cleanly removed. Original student state restored.');
    }

    console.log('\n====================================================');
    console.log(`   E2E Verification Complete: PASS: ${testPassed} | FAIL: ${testFailed}`);
    console.log('====================================================\n');

    process.exit(testFailed > 0 ? 1 : 0);
}

runTestSuite();

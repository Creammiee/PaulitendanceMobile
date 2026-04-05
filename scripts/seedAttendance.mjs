
import { initializeApp } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";

// Configuration copied from lib/firebaseConfig.ts
const firebaseConfig = {
    apiKey: "AIzaSyB4jPhXYCMf4FCyz1HFEApWpo_8111LeGI",
    authDomain: "paulitendance.firebaseapp.com",
    projectId: "paulitendance",
    storageBucket: "paulitendance.firebasestorage.app",
    messagingSenderId: "949742902090",
    appId: "1:949742902090:web:f7660d14b4ee11e5eaffb3",
    measurementId: "G-Y4QX2GN9H5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedAttendanceSystem() {
    console.log("🌱 Seeding Attendance System Data...");

    try {
        // 1. Setup School Settings
        const settingsRef = doc(db, "settings", "schoolConfig");
        await setDoc(settingsRef, {
            schoolName: "Paulitendance High",
            schoolLocation: {
                latitude: 14.5995,
                longitude: 120.9842,
                radius: 200 // meters
            },
            schoolStartTime: "08:00",
            schoolDays: [1, 2, 3, 4, 5] // Mon-Fri
        }, { merge: true });
        console.log("✅ School Settings initialized.");

        // 2. Ensure we have users with roles to link
        // This is a simplified seed. In a real scenario, we'd query existing users.
        // For now, we'll create specific placeholder users if they don't exist to ensure the flow works.

        // PARENT
        const parentId = "seed_parent_01";
        await setDoc(doc(db, "users", parentId), {
            uid: parentId,
            email: "parent.seed@test.com",
            role: "parent",
            fullName: "Mommy Seed",
            createdAt: new Date().toISOString(),
            studentIds: ["seed_student_01"]
        }, { merge: true });

        // TEACHER
        const teacherId = "seed_teacher_01";
        await setDoc(doc(db, "users", teacherId), {
            uid: teacherId,
            email: "teacher.seed@test.com",
            role: "teacher",
            fullName: "Mr. Seed Teacher",
            createdAt: new Date().toISOString(),
            studentIds: ["seed_student_01"]
        }, { merge: true });

        // STUDENT
        const studentId = "seed_student_01";
        await setDoc(doc(db, "users", studentId), {
            uid: studentId,
            email: "student.seed@test.com",
            role: "student",
            fullName: "Junior Seed",
            createdAt: new Date().toISOString(),
            parentId: parentId,
            teacherId: teacherId
        }, { merge: true });

        console.log("✅ Users (Student, Parent, Teacher) linked and initialized.");
        console.log(`   Student ID: ${studentId}`);
        console.log(`   Parent ID: ${parentId}`);
        console.log(`   Teacher ID: ${teacherId}`);

    } catch (error) {
        console.error("❌ Error seeding attendance data:", error);
    }
}

seedAttendanceSystem();

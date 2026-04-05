import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seedDatabase() {
    console.log("🌱 Starting database seeding...");

    const adminEmail = "admin@paulitendance.com";
    const adminPassword = "password123";
    let uid = "setup_placeholder_user";

    try {
        // 1. Create Authentication User
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            uid = userCredential.user.uid;
            console.log(`✅ Admin user created! Email: ${adminEmail}, Password: ${adminPassword}`);
        } catch (authError) {
            console.warn(`⚠️ Authentication setup skipped: ${authError.code}`);
            console.warn("   (This is expected if 'Email/Password' provider is not enabled in Firebase Console)");
            console.warn("   Proceeding to database seeding with placeholder UID...");
            // uid remains "setup_placeholder_user"
        }

        // 2. Create Firestore Documents (Seeding Structure)

        // Create 'students' collection sample
        const studentRef = doc(db, "students", "placeholder_student");
        await setDoc(studentRef, {
            fullName: "Sample Student",
            email: "student@example.com",
            role: "student",
            createdAt: new Date(),
            isSetupPlaceholder: true
        }, { merge: true });
        console.log("✅ 'students' collection initialized.");

        // Create 'parents' collection sample
        const parentRef = doc(db, "parents", "placeholder_parent");
        await setDoc(parentRef, {
            fullName: "Sample Parent",
            email: "parent@example.com",
            role: "parent",
            createdAt: new Date(),
            isSetupPlaceholder: true
        }, { merge: true });
        console.log("✅ 'parents' collection initialized.");

        // Create 'teachers' collection sample
        const teacherRef = doc(db, "teachers", "placeholder_teacher");
        await setDoc(teacherRef, {
            fullName: "Sample Teacher",
            email: "teacher@example.com",
            role: "teacher",
            createdAt: new Date(),
            isSetupPlaceholder: true
        }, { merge: true });
        console.log("✅ 'teachers' collection initialized.");

        // Create 'admins' collection for the created admin user
        if (uid) {
            // If uid is "setup_placeholder_user", we still want to put it in admins to verify the table exists
            const targetUid = uid;
            const adminRef = doc(db, "admins", targetUid);
            await setDoc(adminRef, {
                fullName: "System Admin",
                email: adminEmail,
                role: "admin",
                createdAt: new Date(),
                isSetupPlaceholder: true
            }, { merge: true });
            console.log(`✅ 'admins' collection initialized for UID: ${targetUid}`);
        }

        console.log("🚀 Firestore database structure is ready with separate tables!");

    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();

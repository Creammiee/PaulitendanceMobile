import * as Notifications from 'expo-notifications';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebaseConfig';
import * as SecureStore from '../lib/secureStore';

import { UserRole } from '../types/db';

export type { UserRole };

interface AuthContextProps {
    user: User | null;
    role: UserRole;
    status: 'pending' | 'active' | 'rejected' | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, role: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [status, setStatus] = useState<'pending' | 'active' | 'rejected' | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to store the current device's expo push token in Firestore
    // Note: We need to know the collection to update. For simplicity, we'll try to update
    // based on the known role, or search if not known (though usually we know role after login).
    const registerDeviceToken = async (uid: string, userRole: UserRole) => {
        try {
            const token = await Notifications.getExpoPushTokenAsync();
            if (token.data && userRole) {
                // Determine collection name based on role
                const collectionName = userRole === 'admin' ? 'admins' : `${userRole}s`;
                await setDoc(doc(db, collectionName, uid), { deviceToken: token.data }, { merge: true });
                // Also store locally for quick access
                await SecureStore.setItemAsync('deviceToken', token.data);
            }
        } catch (error) {
            console.log("Error registering device token", error);
        }
    };

    const fetchUserRole = async (uid: string) => {
        // Try to find the user in the unified collection first
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role || null);
            setStatus(data.status || 'active'); // legacy users default to active
            return { role: data.role, status: data.status || 'active' };
        }

        // Try to find the user in legacy collections
        // Check Students
        const studentDoc = await getDoc(doc(db, 'students', uid));
        if (studentDoc.exists()) {
            setRole('student');
            setStatus('active');
            return { role: 'student', status: 'active' };
        }

        // Check Teachers
        const teacherDoc = await getDoc(doc(db, 'teachers', uid));
        if (teacherDoc.exists()) {
            setRole('teacher');
            setStatus('active');
            return { role: 'teacher', status: 'active' };
        }

        // Check Parents
        const parentDoc = await getDoc(doc(db, 'parents', uid));
        if (parentDoc.exists()) {
            setRole('parent');
            setStatus('active');
            return { role: 'parent', status: 'active' };
        }

        // Check Admins
        const adminDoc = await getDoc(doc(db, 'admins', uid));
        if (adminDoc.exists()) {
            setRole('admin');
            setStatus('active');
            return { role: 'admin', status: 'active' };
        }

        // If not found in any (e.g. legacy or error)
        setRole(null);
        setStatus(null);
        return { role: null, status: null };
    };

    // Sign‑in flow with single‑device enforcement
    const signIn = async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;

        // Fetch role and status immediately
        const found = await fetchUserRole(uid);
        const foundRole = found.role;

        if (!foundRole) {
            console.warn("User logged in but no profile found in any collection.");
            // Proceeding without role or maybe throw error? 
            // For now let's allow it but state will be null.
        }

        // Determine collection to check token
        const collectionName = foundRole === 'admin' ? 'admins' : `${foundRole}s`;

        // Check if another device token already exists
        let existingToken = null;
        if (foundRole) {
            const userDoc = await getDoc(doc(db, collectionName, uid));
            existingToken = userDoc.exists() ? (userDoc.data() as any).deviceToken : null;
        }

        let currentToken = null;
        try {
            // Basic check if notification permissions are granted could be added here
            const tokenObj = await Notifications.getExpoPushTokenAsync();
            currentToken = tokenObj.data;
        } catch (e) {
            console.log("Failed to get push token", e);
        }

        if (existingToken && currentToken && existingToken !== currentToken) {
            // Another device is already registered – sign out this session
            await firebaseSignOut(auth);
            setRole(null);
            throw new Error('User is already logged in on another device');
        }
        // Register (or update) this device token
        await registerDeviceToken(uid, foundRole as UserRole);
        // Persist auth token locally for future auto‑login (optional)
        await SecureStore.setItemAsync('uid', uid);
    };

    const signUp = async (email: string, password: string, role: string, fullName: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;

        // Use correct collection based on role
        // role is "student", "parent", "teacher" -> collections "students", "parents", "teachers"
        // (adding 's' suffix generally works for these 3, but let's be explicit if needed)
        const collectionName = role === 'admin' ? 'admins' : `${role}s`;

        // Create user document in the specific collection
        await setDoc(doc(db, collectionName, uid), {
            email,
            role,
            fullName,
            createdAt: new Date(),
        });

        const newRole = role as UserRole
        setRole(newRole);
        setStatus('pending');
        await registerDeviceToken(uid, newRole);
        await SecureStore.setItemAsync('uid', uid);
    };

    const signOut = async () => {
        const uid = auth.currentUser?.uid;
        if (uid && role) {
            try {
                // Remove device token from Firestore
                const collectionName = role === 'admin' ? 'admins' : `${role}s`;
                await setDoc(doc(db, collectionName, uid), { deviceToken: null }, { merge: true });
                await SecureStore.deleteItemAsync('deviceToken');
                await SecureStore.deleteItemAsync('uid');
            } catch (error) {
                console.warn("Error during logout cleanup (non-fatal):", error);
            }
        }
        await firebaseSignOut(auth);
        setRole(null);
        setStatus(null);
        setUser(null);
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (usr) => {
            if (usr) {
                setUser(usr);
                const r = await fetchUserRole(usr.uid);
                // Ensure device token is registered when the user is already logged in (e.g., app restart)
                if (r.role) {
                    await registerDeviceToken(usr.uid, r.role as UserRole);
                }
            } else {
                setUser(null);
                setRole(null);
                setStatus(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, role, status, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook for components to access auth
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

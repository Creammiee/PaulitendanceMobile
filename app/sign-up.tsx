import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { auth, db } from '../lib/firebaseConfig';
import { UserProfile, UserRole } from '../types/db';

export default function SignUpScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [loading, setLoading] = useState(false);

    // New Fields
    const [section, setSection] = useState('');
    const [bindingKeyInput, setBindingKeyInput] = useState('');

    const generateBindingKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const handleSignUp = async () => {
        if (!email || !password || !fullName) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (role === 'student' && !section) {
            Alert.alert("Error", "Please enter your section.");
            return;
        }

        if (role === 'parent' && !bindingKeyInput) {
            Alert.alert("Error", "Please enter your child's binding key.");
            return;
        }

        setLoading(true);
        try {
            // If Parent, validate binding key first before creating auth user
            let linkedStudentId: string | null = null;
            if (role === 'parent') {
                const q = query(collection(db, 'users'), where('bindingKey', '==', bindingKeyInput), limit(1));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    Alert.alert("Error", "Invalid Binding Key. Student not found.");
                    setLoading(false);
                    return;
                }
                linkedStudentId = querySnapshot.docs[0].id;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: fullName });

            const today = new Date();
            let userData: UserProfile = {
                uid: user.uid,
                email: user.email!,
                role: role,
                fullName: fullName,
                createdAt: today,
            };

            if (role === 'student') {
                const newBindingKey = generateBindingKey();
                // Ensure uniqueness in a real app, strict rules.
                userData.section = section;
                userData.bindingKey = newBindingKey;
            }

            if (role === 'parent' && linkedStudentId) {
                userData.studentIds = [linkedStudentId];
            }

            // Save to 'users' collection (unified)
            await setDoc(doc(db, 'users', user.uid), userData);

            // Also save to role-specific collections for easier querying if needed (legacy pattern from setup)
            // But we are moving to 'users' mostly. Let's keep it for compatibility if existing code uses it.
            if (role === 'student') {
                await setDoc(doc(db, 'students', user.uid), userData);
            } else if (role === 'teacher') {
                // Teacher might need section too (handled in Admin later, but optional here)
                await setDoc(doc(db, 'teachers', user.uid), userData);
            } else if (role === 'parent') {
                await setDoc(doc(db, 'parents', user.uid), userData);

                // Link parent to student
                if (linkedStudentId) {
                    const studentRef = doc(db, 'users', linkedStudentId);
                    await updateDoc(studentRef, {
                        parentId: user.uid
                    });
                    // Also update in 'students' collection if we use it
                    // Check if exists before update to be safe, or just update users
                    // We'll trust 'users' collection is primary source of truth now.
                }
            } else if (role === 'admin') {
                await setDoc(doc(db, 'admins', user.uid), userData);
            }

            Alert.alert("Success", "Account created successfully!", [
                { text: "OK", onPress: () => router.replace('/login' as any) } // Or auto login
            ]);

        } catch (error: any) {
            console.error(error);
            Alert.alert("Registration Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>

                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join Paulitendance today</Text>

                <View style={styles.roleContainer}>
                    <Text style={styles.label}>I am a:</Text>
                    <View style={styles.roleButtons}>
                        {(['student', 'parent', 'teacher'] as UserRole[]).map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                                onPress={() => setRole(r)}
                            >
                                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                                    {r!.charAt(0).toUpperCase() + r!.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="person-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={Colors.lilacBlue}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={Colors.lilacBlue}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={Colors.lilacBlue}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {/* Dynamic Fields based on Role */}
                    {role === 'student' && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="school-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Section (e.g. Grade 10 - Rizal)"
                                placeholderTextColor={Colors.lilacBlue}
                                value={section}
                                onChangeText={setSection}
                            />
                        </View>
                    )}

                    {role === 'parent' && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="key-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Child's Binding Key"
                                placeholderTextColor={Colors.lilacBlue}
                                value={bindingKeyInput}
                                onChangeText={setBindingKeyInput}
                                autoCapitalize="characters"
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginLink}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login' as any)}>
                            <Text style={styles.loginBtnText}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.nightTime,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 60,
    },
    backButton: {
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.lilacBlue,
        marginBottom: 30,
    },
    roleContainer: {
        marginBottom: 20,
    },
    label: {
        color: Colors.white,
        marginBottom: 10,
        fontSize: 16,
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    roleBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.lilacBlue,
    },
    roleBtnActive: {
        backgroundColor: Colors.solidBlue,
        borderColor: Colors.solidBlue,
    },
    roleBtnText: {
        color: Colors.lilacBlue,
    },
    roleBtnTextActive: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepSea,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.sailingBlue,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: Colors.white,
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.solidBlue,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Colors.solidBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        color: Colors.lilacBlue,
        fontSize: 14,
    },
    loginBtnText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

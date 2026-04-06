import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { db, secondaryAuth } from '../../lib/firebaseConfig';
import { UserProfile, UserRole } from '../../types/db';

export default function AdminUsersScreen() {
    const [activeTab, setActiveTab] = useState<'pending' | 'add'>('pending');
    
    // Pending Tab State
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Add User Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [section, setSection] = useState('');
    const [bindingKeyInput, setBindingKeyInput] = useState('');
    const [addingUser, setAddingUser] = useState(false);

    useEffect(() => {
        if (activeTab === 'pending') {
            loadPendingUsers();
        }
    }, [activeTab]);

    const loadPendingUsers = async () => {
        setLoadingPending(true);
        try {
            const q = query(
                collection(db, 'users'), 
                where('status', '==', 'pending')
            );
            const querySnapshot = await getDocs(q);
            const usersList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                usersList.push(doc.data() as UserProfile);
            });
            setPendingUsers(usersList);
        } catch (error) {
            console.error("Error loading pending users:", error);
            Alert.alert("Error", "Failed to load pending users.");
        } finally {
            setLoadingPending(false);
        }
    };

    const handleApprove = async (user: UserProfile) => {
        setProcessingId(user.uid);
        try {
            // Update unified collection
            await updateDoc(doc(db, 'users', user.uid), { status: 'active' });
            
            // Sync with role specific collection for legacy support
            const collectionName = user.role === 'admin' ? 'admins' : `${user.role}s`;
            await updateDoc(doc(db, collectionName, user.uid), { status: 'active' }).catch(e => console.log('Legacy collection update omitted/failed'));
            
            Alert.alert("Success", `${user.fullName} has been approved.`);
            setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to approve user.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (user: UserProfile) => {
        setProcessingId(user.uid);
        try {
            await updateDoc(doc(db, 'users', user.uid), { status: 'rejected' });
            const collectionName = user.role === 'admin' ? 'admins' : `${user.role}s`;
            await updateDoc(doc(db, collectionName, user.uid), { status: 'rejected' }).catch(e => console.log('Legacy collection update omitted/failed'));
            
            Alert.alert("Success", `${user.fullName} has been rejected.`);
            setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to reject user.");
        } finally {
            setProcessingId(null);
        }
    };

    const generateBindingKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const handleAddUser = async () => {
        if (!email || !password || !fullName || !role) {
            Alert.alert("Error", "Please fill in all general fields.");
            return;
        }

        if (role === 'parent' && !bindingKeyInput) {
            Alert.alert("Error", "Please enter the child's binding key.");
            return;
        }

        if ((role === 'student' || role === 'teacher') && !section) {
            Alert.alert("Notice", "Are you sure you want to proceed without a section?", [
                { text: "Cancel", style: "cancel" },
                { text: "Proceed", onPress: proceedWithAddUser }
            ]);
            return;
        }

        proceedWithAddUser();
    };

    const proceedWithAddUser = async () => {
        setAddingUser(true);
        try {
            // Validate binding key first if parent
            let linkedStudentId: string | null = null;
            if (role === 'parent') {
                const q = query(collection(db, 'users'), where('bindingKey', '==', bindingKeyInput));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    Alert.alert("Error", "Invalid Binding Key. Student not found.");
                    setAddingUser(false);
                    return;
                }
                linkedStudentId = querySnapshot.docs[0].id;
            }

            // Use secondary auth instance so the Admin's session is not interrupted
            const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = credential.user;

            let userData: UserProfile = {
                uid: user.uid,
                email: user.email!,
                role: role,
                fullName: fullName,
                createdAt: new Date(),
                status: 'active', // Since admin is creating, bypass pending
            };

            if (role === 'student') {
                userData.section = section;
                userData.bindingKey = generateBindingKey();
            } else if (role === 'teacher') {
                userData.section = section;
            } else if (role === 'parent' && linkedStudentId) {
                userData.studentIds = [linkedStudentId];
            }

            // Save to unified users
            await setDoc(doc(db, 'users', user.uid), userData);

            // Legacy
            const collectionName = role === 'admin' ? 'admins' : `${role}s`;
            await setDoc(doc(db, collectionName, user.uid), userData);

            if (role === 'parent' && linkedStudentId) {
                // Link parent to student
                const studentRef = doc(db, 'users', linkedStudentId);
                await updateDoc(studentRef, {
                    parentId: user.uid
                });
            }

            // Sign out the new user from secondary Auth (cleanup)
            await secondaryAuth.signOut();

            Alert.alert("Success", "User has been created and is active immediately.");
            
            // Clear form
            setEmail('');
            setPassword('');
            setFullName('');
            setSection('');
            setBindingKeyInput('');
            setRole('student');

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message);
        } finally {
            setAddingUser(false);
        }
    };

    const renderPendingUser = ({ item }: { item: UserProfile }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={40} color={Colors.lilacBlue} />
                <View style={styles.info}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.email}>{item.email} • {item.role?.toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.btn, styles.approveBtn]} 
                    onPress={() => handleApprove(item)}
                    disabled={processingId === item.uid}
                >
                    {processingId === item.uid ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                        <Text style={styles.btnText}>Approve</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.btn, styles.rejectBtn]} 
                    onPress={() => handleReject(item)}
                    disabled={processingId === item.uid}
                >
                    <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Management</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending Approvals</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'add' && styles.activeTab]}
                    onPress={() => setActiveTab('add')}
                >
                    <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add New User</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'pending' ? (
                loadingPending ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={Colors.lilacBlue} />
                    </View>
                ) : (
                    <FlatList
                        data={pendingUsers}
                        keyExtractor={item => item.uid}
                        renderItem={renderPendingUser}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No pending users awaiting approval.</Text>}
                    />
                )
            ) : (
                <ScrollView contentContainerStyle={styles.formContainer}>
                    <Text style={styles.formSubtitle}>Create an Active Account</Text>

                    <Text style={styles.label}>Role</Text>
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
                            placeholder="Email Address"
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

                    {(role === 'student' || role === 'teacher') && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="school-outline" size={20} color={Colors.lilacBlue} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Section (Optional)"
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
                        style={styles.submitBtn} 
                        onPress={handleAddUser}
                        disabled={addingUser}
                    >
                        {addingUser ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.submitBtnText}>Create User</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.nightTime,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.white,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.sailingBlue,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: Colors.solidBlue,
    },
    tabText: {
        fontSize: 16,
        color: Colors.lilacBlue,
        fontWeight: 'bold',
    },
    activeTabText: {
        color: Colors.white,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: Colors.deepSea,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.sailingBlue,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        color: Colors.lilacBlue,
        fontSize: 12,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveBtn: {
        backgroundColor: Colors.dive,
    },
    rejectBtn: {
        backgroundColor: Colors.error,
        opacity: 0.8,
    },
    btnText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    emptyText: {
        color: Colors.lilacBlue,
        textAlign: 'center',
        marginTop: 40,
    },
    formContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formSubtitle: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
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
        marginBottom: 20,
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
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepSea,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.sailingBlue,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: Colors.white,
        fontSize: 16,
    },
    submitBtn: {
        backgroundColor: Colors.solidBlue,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

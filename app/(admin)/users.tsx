import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { db, secondaryAuth } from '../../lib/firebaseConfig';
import { UserProfile, UserRole } from '../../types/db';

export default function AdminUsersScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'add'>('pending');
    
    // Pending Tab State
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Active Tab State
    const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
    const [loadingActive, setLoadingActive] = useState(false);
    const [directoryFilter, setDirectoryFilter] = useState<UserRole>('student');

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
        } else if (activeTab === 'active') {
            loadActiveUsers();
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

    const loadActiveUsers = async () => {
        setLoadingActive(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as UserProfile;
                if (data.status !== 'pending') {
                    usersList.push(data);
                }
            });
            setActiveUsers(usersList);
        } catch (error) {
            console.error("Error loading active users:", error);
            Alert.alert("Error", "Failed to load active users.");
        } finally {
            setLoadingActive(false);
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
            
            Alert.alert("Success", `${user.fullName} has been rejected or revoked.`);
            setPendingUsers(prev => prev.filter(u => u.uid !== user.uid));
            
            // Also update active users if we revoked an active one
            setActiveUsers(prev => 
                prev.map(u => u.uid === user.uid ? { ...u, status: 'rejected' } : u)
            );
            
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
                <Ionicons name="person-circle-outline" size={40} color={theme.lilacBlue} />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.fullName}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? theme.error : item.role === 'teacher' ? theme.solidBlue : theme.dive }]}>
                            <Text style={styles.roleBadgeText}>{item.role?.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.email}>{item.email}</Text>
                    <Text style={styles.userIdText}>ID: {item.uid.substring(0, 8).toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.btn, styles.approveBtn]} 
                    onPress={() => handleApprove(item)}
                    disabled={processingId === item.uid}
                >
                    {processingId === item.uid ? (
                        <ActivityIndicator color={theme.white} size="small" />
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

    const renderActiveUser = ({ item }: { item: UserProfile }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={40} color={theme.lilacBlue} />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.fullName}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? theme.error : item.role === 'teacher' ? theme.solidBlue : theme.dive }]}>
                            <Text style={styles.roleBadgeText}>{item.role?.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.email}>{item.email}</Text>
                    <View style={styles.credentialRow}>
                        <Text style={styles.userIdText}>ID: {item.uid.substring(0, 8).toUpperCase()}</Text>
                        {item.bindingKey && (
                            <Text style={styles.bindingKeyText}>Key: {item.bindingKey}</Text>
                        )}
                    </View>
                    <Text style={[styles.email, { marginTop: 4 }]}>Status: {item.status?.toUpperCase() || 'ACTIVE'}</Text>
                </View>
            </View>
            <View style={styles.actionButtons}>
                {item.status !== 'rejected' && (
                    <TouchableOpacity 
                        style={[styles.btn, styles.rejectBtn]} 
                        onPress={() => handleReject(item)}
                        disabled={processingId === item.uid}
                    >
                        {processingId === item.uid ? (
                            <ActivityIndicator color={theme.white} size="small" />
                        ) : (
                            <Text style={styles.btnText}>Revoke Access</Text>
                        )}
                    </TouchableOpacity>
                )}
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
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                    onPress={() => setActiveTab('active')}
                >
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Directory</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'add' && styles.activeTab]}
                    onPress={() => setActiveTab('add')}
                >
                    <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'pending' ? (
                loadingPending ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={theme.lilacBlue} />
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
            ) : activeTab === 'active' ? (
                <View style={{ flex: 1 }}>
                    <View style={styles.subTabContainer}>
                        {(['student', 'parent', 'teacher'] as const).map(filterRole => (
                            <TouchableOpacity 
                                key={filterRole}
                                style={[styles.subTab, directoryFilter === filterRole && styles.activeSubTab]}
                                onPress={() => setDirectoryFilter(filterRole as any)}
                            >
                                <Text style={[styles.subTabText, directoryFilter === filterRole && styles.activeSubTabText]}>
                                    {filterRole.charAt(0).toUpperCase() + filterRole.slice(1)}s
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {loadingActive ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={theme.lilacBlue} />
                        </View>
                    ) : (
                        <FlatList
                            data={activeUsers.filter(u => u.role === directoryFilter)}
                            keyExtractor={item => item.uid}
                            renderItem={renderActiveUser}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={<Text style={styles.emptyText}>No active users found for this role.</Text>}
                        />
                    )}
                </View>
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
                        <Ionicons name="person-outline" size={20} color={theme.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={theme.lilacBlue}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color={theme.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor={theme.lilacBlue}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color={theme.lilacBlue} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={theme.lilacBlue}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {(role === 'student' || role === 'teacher') && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="school-outline" size={20} color={theme.lilacBlue} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Section (Optional)"
                                placeholderTextColor={theme.lilacBlue}
                                value={section}
                                onChangeText={setSection}
                            />
                        </View>
                    )}

                    {role === 'parent' && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="key-outline" size={20} color={theme.lilacBlue} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Child's Binding Key"
                                placeholderTextColor={theme.lilacBlue}
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
                            <ActivityIndicator color={theme.white} />
                        ) : (
                            <Text style={styles.submitBtnText}>Create User</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            )}
        </View>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.sailingBlue,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: theme.solidBlue,
    },
    tabText: {
        fontSize: 16,
        color: theme.lilacBlue,
        fontWeight: 'bold',
    },
    activeTabText: {
        color: theme.text,
    },
    subTabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        gap: 8,
    },
    subTab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
    },
    activeSubTab: {
        backgroundColor: theme.solidBlue,
        borderColor: theme.solidBlue,
    },
    subTabText: {
        color: theme.lilacBlue,
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeSubTabText: {
        color: theme.text,
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
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
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
        color: theme.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        color: theme.lilacBlue,
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
        backgroundColor: theme.dive,
    },
    rejectBtn: {
        backgroundColor: theme.error,
        opacity: 0.8,
    },
    btnText: {
        color: theme.white,
        fontWeight: 'bold',
    },
    emptyText: {
        color: theme.lilacBlue,
        textAlign: 'center',
        marginTop: 40,
    },
    formContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formSubtitle: {
        color: theme.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        color: theme.text,
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
        borderColor: theme.lilacBlue,
    },
    roleBtnActive: {
        backgroundColor: theme.solidBlue,
        borderColor: theme.solidBlue,
    },
    roleBtnText: {
        color: theme.lilacBlue,
    },
    roleBtnTextActive: {
        color: theme.white,
        fontWeight: 'bold',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: theme.text,
        fontSize: 16,
    },
    submitBtn: {
        backgroundColor: theme.solidBlue,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleBadgeText: {
        color: theme.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    userIdText: {
        color: theme.lilacBlue,
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    credentialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    bindingKeyText: {
        color: theme.solidBlue,
        fontSize: 12,
        fontWeight: 'bold',
    },
    });
}

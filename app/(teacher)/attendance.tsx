import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { db } from '../../lib/firebaseConfig';
import { Attendance, UserProfile } from '../../types/db';

export default function TeacherAttendanceScreen() {
    const router = useRouter();
    const { user } = useAuth(); // We might need userProfile here if user doesn't have role
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState<string | null>(null);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            // Get Teacher's Profile to find their section
            if (!user) return;
            const teacherRef = doc(db, 'users', user.uid);
            const teacherSnap = await getDoc(teacherRef);

            if (!teacherSnap.exists()) {
                Alert.alert("Error", "Teacher profile not found.");
                return;
            }

            const teacherData = teacherSnap.data() as UserProfile;
            const teacherSection = teacherData.section;

            if (!teacherSection) {
                // If no section assigned, maybe show none? user said "specific section"
                setStudents([]);
                return;
            }

            // Query students with the same section
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('section', '==', teacherSection)
            );

            const querySnapshot = await getDocs(q);
            const studentsList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                studentsList.push(doc.data() as UserProfile);
            });
            setStudents(studentsList);
        } catch (error) {
            console.error("Error loading students:", error);
            Alert.alert("Error", "Failed to load students.");
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (studentId: string, status: 'present' | 'late' | 'absent') => {
        setMarking(studentId);
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const attendanceRef = doc(db, 'attendance', `${studentId}_${todayStr}`);

            const attendanceData: Attendance = {
                id: `${studentId}_${todayStr}`,
                studentId: studentId,
                date: todayStr,
                status: status,
                timeIn: now.toISOString(),
                markedBy: 'teacher'
            };

            await setDoc(attendanceRef, attendanceData);

            // If Late, automatically create a Promissory Letter
            if (status === 'late') {
                const letterId = `promissory_${studentId}_${todayStr}`;
                const letterRef = doc(db, 'letters', letterId);
                await setDoc(letterRef, {
                    id: letterId,
                    type: 'promissory',
                    studentId: studentId,
                    date: todayStr,
                    reason: 'Late arrival',
                    status: 'pending',
                    parentApproved: false,
                    teacherApproved: false,
                    createdAt: now.toISOString()
                });
                Alert.alert("Success", "Marked Late & generated Promissory Letter.");
            } else {
                Alert.alert("Success", `Marked ${status} for student.`);
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
            Alert.alert("Error", "Failed to mark attendance.");
        } finally {
            setMarking(null);
        }
    };

    const renderStudentItem = ({ item }: { item: UserProfile }) => (
        <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
                <Ionicons name="person-circle-outline" size={40} color={Colors.lilacBlue} />
                <View style={styles.textContainer}>
                    <Text style={styles.studentName}>{item.fullName}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.dive }]}
                    onPress={() => markAttendance(item.uid, 'present')}
                    disabled={marking === item.uid}
                >
                    <Text style={styles.btnText}>P</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFA500' }]} // Orange for Late
                    onPress={() => markAttendance(item.uid, 'late')}
                    disabled={marking === item.uid}
                >
                    <Text style={styles.btnText}>L</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.error }]}
                    onPress={() => markAttendance(item.uid, 'absent')}
                    disabled={marking === item.uid}
                >
                    <Text style={styles.btnText}>A</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.lilacBlue} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Class Attendance</Text>
                {/* Link to Letters Review if we want */}
            </View>

            <FlatList
                data={students}
                keyExtractor={(item) => item.uid}
                renderItem={renderStudentItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.nightTime,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.nightTime,
        justifyContent: 'center',
        alignItems: 'center',
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
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    studentCard: {
        backgroundColor: Colors.deepSea,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.sailingBlue,
    },
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        marginLeft: 12,
    },
    studentName: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    studentEmail: {
        color: Colors.lilacBlue,
        fontSize: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyText: {
        color: Colors.lilacBlue,
        textAlign: 'center',
        marginTop: 40,
    }
});

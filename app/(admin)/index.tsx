import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, doc, updateDoc, getDocs, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { db } from '../../lib/firebaseConfig';
import { Letter, UserProfile } from '../../types/db';

export default function AdminDashboard() {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    const { signOut, user } = useAuth();

    const [metrics, setMetrics] = useState({
        pendingUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
    });
    const [pendingLetters, setPendingLetters] = useState<(Letter & { studentName?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        // 1. Listen for User Metrics
        const usersQuery = collection(db, 'users');
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            let pending = 0;
            let students = 0;
            let teachers = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as UserProfile;
                if (data.status === 'pending') pending++;
                if (data.role === 'student') students++;
                if (data.role === 'teacher') teachers++;
            });
            setMetrics({ pendingUsers: pending, totalStudents: students, totalTeachers: teachers });
        });

        // 2. Listen for Pending Letters
        const lettersQuery = query(
            collection(db, 'letters'), 
            where('status', '==', 'pending')
        );
        const unsubLetters = onSnapshot(lettersQuery, async (snapshot) => {
            const lettersList: any[] = [];
            for (const docSnap of snapshot.docs) {
                const letterData = docSnap.data() as Letter;
                // Fetch student name for the letter
                const studentSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', letterData.studentId)));
                let studentName = 'Unknown Student';
                studentSnap.forEach(s => studentName = s.data().fullName);
                
                lettersList.push({ ...letterData, studentName });
            }
            
            // Sort locally to avoid Firebase Index requirements
            lettersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setPendingLetters(lettersList);
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubLetters();
        };
    }, []);

    const handleUpdateLetterStatus = async (letterId: string, status: 'approved' | 'rejected') => {
        setProcessing(letterId);
        try {
            const letterRef = doc(db, 'letters', letterId);
            await updateDoc(letterRef, { status });
            Alert.alert('Success', `Letter ${status} successfully.`);
        } catch (error) {
            console.error('Error updating letter:', error);
            Alert.alert('Error', 'Failed to update letter status.');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.lilacBlue} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Command Center</Text>
                    <Text style={styles.subtitle}>Real-time Monitoring</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color={theme.white} />
                </TouchableOpacity>
            </View>

            {/* Analytics Grid */}
            <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { borderLeftColor: theme.error, borderLeftWidth: 4 }]}>
                    <Text style={styles.metricValue}>{metrics.pendingUsers}</Text>
                    <Text style={styles.metricLabel}>Pending Users</Text>
                    <Ionicons name="alert-circle" size={20} color={theme.error} style={styles.metricIcon} />
                </View>
                <View style={[styles.metricCard, { borderLeftColor: theme.solidBlue, borderLeftWidth: 4 }]}>
                    <Text style={styles.metricValue}>{metrics.totalStudents}</Text>
                    <Text style={styles.metricLabel}>Total Students</Text>
                    <Ionicons name="school" size={20} color={theme.solidBlue} style={styles.metricIcon} />
                </View>
                <View style={[styles.metricCard, { borderLeftColor: theme.lilacBlue, borderLeftWidth: 4 }]}>
                    <Text style={styles.metricValue}>{metrics.totalTeachers}</Text>
                    <Text style={styles.metricLabel}>Total Teachers</Text>
                    <Ionicons name="people" size={20} color={theme.lilacBlue} style={styles.metricIcon} />
                </View>
            </View>

            {/* Pending Letters Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Letters</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingLetters.length}</Text>
                </View>
            </View>

            {pendingLetters.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="mail-open-outline" size={48} color={theme.lilacBlue} />
                    <Text style={styles.emptyText}>No pending letters to review.</Text>
                </View>
            ) : (
                pendingLetters.map((letter) => (
                    <View key={letter.id} style={styles.letterCard}>
                        <View style={styles.letterInfo}>
                            <View style={styles.letterHeader}>
                                <Text style={styles.studentName}>{letter.studentName}</Text>
                                <View style={[styles.typeBadge, { backgroundColor: letter.type === 'excuse' ? theme.dive : theme.solidBlue }]}>
                                    <Text style={styles.typeBadgeText}>{letter.type.toUpperCase()}</Text>
                                </View>
                            </View>
                            <View style={styles.reasonRow}>
                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.lilacBlue} />
                                <Text style={styles.letterReason} numberOfLines={2}>"{letter.reason}"</Text>
                            </View>
                            <Text style={styles.letterDate}>{letter.date}</Text>
                        </View>
                        <View style={styles.actionColumn}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.approveBtn]} 
                                onPress={() => handleUpdateLetterStatus(letter.id, 'approved')}
                                disabled={processing === letter.id}
                            >
                                <Ionicons name="checkmark" size={20} color={theme.white} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.rejectBtn]} 
                                onPress={() => handleUpdateLetterStatus(letter.id, 'rejected')}
                                disabled={processing === letter.id}
                            >
                                <Ionicons name="close" size={20} color={theme.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            padding: 20,
            paddingTop: 60,
        },
        loadingContainer: {
            flex: 1,
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: theme.text,
        },
        subtitle: {
            fontSize: 14,
            color: theme.lilacBlue,
            marginTop: 2,
        },
        logoutBtn: {
            padding: 10,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
        },
        metricsGrid: {
            flexDirection: 'row',
            gap: 12,
            marginBottom: 30,
            flexWrap: 'wrap',
        },
        metricCard: {
            flex: 1,
            minWidth: 100,
            backgroundColor: theme.card,
            padding: 16,
            borderRadius: 16,
            position: 'relative',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        metricValue: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text,
        },
        metricLabel: {
            fontSize: 12,
            color: theme.lilacBlue,
            marginTop: 4,
        },
        metricIcon: {
            position: 'absolute',
            top: 10,
            right: 10,
            opacity: 0.5,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            gap: 10,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.text,
        },
        badge: {
            backgroundColor: theme.solidBlue,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
        },
        badgeText: {
            color: theme.white,
            fontSize: 12,
            fontWeight: 'bold',
        },
        letterCard: {
            flexDirection: 'row',
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.sailingBlue,
        },
        letterInfo: {
            flex: 1,
        },
        letterHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
        },
        typeBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        typeBadgeText: {
            color: theme.white,
            fontSize: 9,
            fontWeight: 'bold',
        },
        studentName: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text,
        },
        reasonRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
        },
        letterReason: {
            fontSize: 13,
            color: theme.lilacBlue,
            fontStyle: 'italic',
            flex: 1,
        },
        letterDate: {
            fontSize: 12,
            color: theme.lilacBlue,
            marginTop: 8,
            opacity: 0.7,
        },
        actionColumn: {
            justifyContent: 'center',
            gap: 10,
            paddingLeft: 10,
        },
        actionBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        approveBtn: {
            backgroundColor: '#4CAF50',
        },
        rejectBtn: {
            backgroundColor: theme.error,
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 40,
            opacity: 0.5,
        },
        emptyText: {
            color: theme.lilacBlue,
            marginTop: 10,
            fontSize: 14,
        }
    });
}

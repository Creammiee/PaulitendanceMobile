import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { db } from '../../lib/firebaseConfig';
import { Attendance } from '../../types/db';

export default function StudentHistoryScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    const { user } = useAuth();

    const [history, setHistory] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'attendance'),
            where('studentId', '==', user.uid),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const records: Attendance[] = [];
            let p = 0, l = 0, a = 0;
            
            snapshot.forEach((doc) => {
                const data = doc.data() as Attendance;
                records.push(data);
                if (data.status === 'present') p++;
                if (data.status === 'late') l++;
                if (data.status === 'absent') a++;
            });

            setHistory(records);
            setStats({ present: p, late: l, absent: a });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const renderItem = ({ item }: { item: Attendance }) => (
        <View style={styles.historyCard}>
            <View style={styles.cardMain}>
                <View style={styles.dateCircle}>
                    <Text style={styles.dateDay}>{item.date.split('-')[2]}</Text>
                    <Text style={styles.dateMonth}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</Text>
                </View>
                <View style={styles.infoColumn}>
                    <Text style={styles.statusLabel}>{item.status.toUpperCase()}</Text>
                    <Text style={styles.markedBy}>Marked by {item.markedBy}</Text>
                </View>
                <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>
                        {item.timeIn ? new Date(item.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                    <Ionicons 
                        name={item.status === 'present' ? 'checkmark-circle' : item.status === 'late' ? 'time' : 'close-circle'} 
                        size={24} 
                        color={item.status === 'present' ? '#4CAF50' : item.status === 'late' ? '#FFA500' : theme.error} 
                    />
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.lilacBlue} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Attendance History</Text>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#FFA500' }]}>{stats.late}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.error }]}>{stats.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                </View>
            </View>

            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={64} color={theme.lilacBlue} />
                        <Text style={styles.emptyText}>No attendance records yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        header: {
            padding: 20,
            paddingTop: 60,
            backgroundColor: theme.background,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text,
        },
        loadingContainer: {
            flex: 1,
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center',
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 20,
            marginHorizontal: 20,
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.sailingBlue,
        },
        statBox: {
            alignItems: 'center',
        },
        statValue: {
            fontSize: 24,
            fontWeight: 'bold',
        },
        statLabel: {
            fontSize: 12,
            color: theme.lilacBlue,
            marginTop: 4,
        },
        listContent: {
            paddingHorizontal: 20,
            paddingBottom: 40,
        },
        historyCard: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.sailingBlue,
        },
        cardMain: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        dateCircle: {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: theme.deepSea,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.sailingBlue,
        },
        dateDay: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text,
        },
        dateMonth: {
            fontSize: 10,
            color: theme.lilacBlue,
            textTransform: 'uppercase',
        },
        infoColumn: {
            flex: 1,
            marginLeft: 16,
        },
        statusLabel: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text,
        },
        markedBy: {
            fontSize: 12,
            color: theme.lilacBlue,
            marginTop: 2,
        },
        timeColumn: {
            alignItems: 'flex-end',
        },
        timeText: {
            fontSize: 14,
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 4,
        },
        emptyState: {
            alignItems: 'center',
            marginTop: 60,
            opacity: 0.5,
        },
        emptyText: {
            color: theme.lilacBlue,
            marginTop: 10,
            fontSize: 16,
        },
    });
}

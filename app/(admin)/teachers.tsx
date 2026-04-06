import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { db } from '../../lib/firebaseConfig';
import { UserProfile } from '../../types/db';

export default function AdminTeachersScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState<UserProfile | null>(null);
    const [newSection, setNewSection] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
            const querySnapshot = await getDocs(q);
            const teachersList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                teachersList.push(doc.data() as UserProfile);
            });
            setTeachers(teachersList);
        } catch (error) {
            console.error("Error loading teachers:", error);
            Alert.alert("Error", "Failed to load teachers.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (teacher: UserProfile) => {
        setSelectedTeacher(teacher);
        setNewSection(teacher.section || '');
        setModalVisible(true);
    };

    const handleSaveSection = async () => {
        if (!selectedTeacher) return;
        setUpdating(true);
        try {
            const userRef = doc(db, 'users', selectedTeacher.uid);
            await updateDoc(userRef, {
                section: newSection
            });

            // Update local state
            setTeachers(prev => prev.map(t =>
                t.uid === selectedTeacher.uid ? { ...t, section: newSection } : t
            ));

            Alert.alert("Success", "Teacher's section updated.");
            setModalVisible(false);
            setSelectedTeacher(null);
        } catch (error) {
            console.error("Error updating section:", error);
            Alert.alert("Error", "Failed to update section.");
        } finally {
            setUpdating(false);
        }
    };

    const renderTeacherItem = ({ item }: { item: UserProfile }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)}>
            <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={40} color={theme.lilacBlue} />
                <View style={styles.info}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                <Ionicons name="create-outline" size={24} color={theme.solidBlue} />
            </View>
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>Assigned Section:</Text>
                <Text style={[styles.sectionValue, !item.section && styles.noSection]}>
                    {item.section || 'None Assigned'}
                </Text>
            </View>
        </TouchableOpacity>
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
                <Text style={styles.title}>Manage Teachers</Text>
            </View>

            <FlatList
                data={teachers}
                keyExtractor={item => item.uid}
                renderItem={renderTeacherItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No teachers found.</Text>}
            />

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Section</Text>
                        <Text style={styles.modalSubtitle}>Assign a section to {selectedTeacher?.fullName}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Section Name (e.g. Grade 10 - Rizal)"
                            placeholderTextColor={theme.lilacBlue}
                            value={newSection}
                            onChangeText={setNewSection}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.saveBtn]}
                                onPress={handleSaveSection}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color={theme.white} />
                                ) : (
                                    <Text style={styles.modalBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.nightTime,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.nightTime,
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
        color: theme.white,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: theme.deepSea,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        color: theme.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        color: theme.lilacBlue,
        fontSize: 12,
    },
    sectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 8,
        borderRadius: 8,
    },
    sectionLabel: {
        color: theme.lilacBlue,
        fontSize: 14,
    },
    sectionValue: {
        color: theme.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    noSection: {
        color: '#FFA500',
        fontStyle: 'italic',
    },
    emptyText: {
        color: theme.lilacBlue,
        textAlign: 'center',
        marginTop: 40,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.nightTime,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.white,
        marginBottom: 8,
    },
    modalSubtitle: {
        color: theme.lilacBlue,
        marginBottom: 16,
    },
    input: {
        backgroundColor: theme.deepSea,
        color: theme.white,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
    },
    saveBtn: {
        backgroundColor: theme.solidBlue,
    },
    modalBtnText: {
        color: theme.white,
        fontWeight: 'bold',
    },
    });
}

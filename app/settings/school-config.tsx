import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { useThemeContext } from '../../ctx/ThemeContext';
import { db } from '../../lib/firebaseConfig';
import { SchoolSettings } from '../../types/db';

export default function SchoolConfigScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    const { themeMode, setThemeMode } = useThemeContext();

    const router = useRouter();
    const { user, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [schoolName, setSchoolName] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    const daysOfWeek = [
        { id: 1, label: 'Mon' },
        { id: 2, label: 'Tue' },
        { id: 3, label: 'Wed' },
        { id: 4, label: 'Thu' },
        { id: 5, label: 'Fri' },
        { id: 6, label: 'Sat' },
        { id: 0, label: 'Sun' },
    ];

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const docRef = doc(db, 'settings', 'schoolConfig');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolSettings;
                setSchoolName(data.schoolName);
                setStartTime(data.schoolStartTime);
                setLatitude(data.schoolLocation.latitude.toString());
                setLongitude(data.schoolLocation.longitude.toString());
                setRadius(data.schoolLocation.radius.toString());
                setSelectedDays(data.schoolDays);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            Alert.alert("Error", "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!role || (role !== 'admin' && role !== 'teacher')) {
            Alert.alert("Unauthorized", "You do not have permission to edit settings.");
            return;
        }

        setSaving(true);
        try {
            const settings: SchoolSettings = {
                schoolName,
                schoolStartTime: startTime,
                schoolLocation: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    radius: parseFloat(radius),
                },
                schoolDays: selectedDays,
            };

            await setDoc(doc(db, 'settings', 'schoolConfig'), settings, { merge: true });
            Alert.alert("Success", "School settings updated successfully.");
        } catch (error) {
            console.error("Error saving settings:", error);
            Alert.alert("Error", "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) {
            setSelectedDays(selectedDays.filter(d => d !== dayId));
        } else {
            setSelectedDays([...selectedDays, dayId]);
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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.title}>School Settings</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>App Appearance</Text>
                <View style={styles.themeContainer}>
                    {(['light', 'dark', 'system'] as const).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.themeButton,
                                themeMode === mode && styles.themeButtonSelected
                            ]}
                            onPress={() => setThemeMode(mode)}
                        >
                            <Ionicons 
                                name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'settings-outline'} 
                                size={18} 
                                color={themeMode === mode ? theme.white : theme.lilacBlue} 
                            />
                            <Text style={[
                                styles.themeText,
                                themeMode === mode && styles.themeTextSelected
                            ]}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>School Configuration</Text>
                <Text style={styles.label}>School Name</Text>
                <TextInput
                    style={styles.input}
                    value={schoolName}
                    onChangeText={setSchoolName}
                    placeholder="Enter school name"
                    placeholderTextColor={theme.lilacBlue + '80'}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Start Time (HH:MM)</Text>
                <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="08:00"
                    placeholderTextColor={theme.lilacBlue + '80'}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>School Days</Text>
                <View style={styles.daysContainer}>
                    {daysOfWeek.map((day) => (
                        <TouchableOpacity
                            key={day.id}
                            style={[
                                styles.dayButton,
                                selectedDays.includes(day.id) && styles.dayButtonSelected
                            ]}
                            onPress={() => toggleDay(day.id)}
                        >
                            <Text style={[
                                styles.dayText,
                                selectedDays.includes(day.id) && styles.dayTextSelected
                            ]}>{day.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location Configuration</Text>

                <Text style={styles.label}>Latitude</Text>
                <TextInput
                    style={styles.input}
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="numeric"
                    placeholder="14.5995"
                    placeholderTextColor={theme.lilacBlue + '80'}
                />

                <Text style={styles.label}>Longitude</Text>
                <TextInput
                    style={styles.input}
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="numeric"
                    placeholder="120.9842"
                    placeholderTextColor={theme.lilacBlue + '80'}
                />

                <Text style={styles.label}>Radius (meters)</Text>
                <TextInput
                    style={styles.input}
                    value={radius}
                    onChangeText={setRadius}
                    keyboardType="numeric"
                    placeholder="200"
                    placeholderTextColor={theme.lilacBlue + '80'}
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color={theme.white} />
                ) : (
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 16,
        marginTop: 8,
    },
    label: {
        fontSize: 14,
        color: theme.lilacBlue,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
        borderRadius: 12,
        padding: 16,
        color: theme.text,
        fontSize: 16,
        marginBottom: 12,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayButton: {
        width: 45,
        height: 45,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.card,
    },
    dayButtonSelected: {
        backgroundColor: theme.solidBlue,
        borderColor: theme.lilacBlue,
    },
    dayText: {
        color: theme.lilacBlue,
        fontSize: 12,
        fontWeight: 'bold',
    },
    dayTextSelected: {
        color: theme.white,
    },
    themeContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    themeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.sailingBlue,
        backgroundColor: theme.card,
    },
    themeButtonSelected: {
        backgroundColor: theme.solidBlue,
        borderColor: theme.lilacBlue,
    },
    themeText: {
        color: theme.lilacBlue,
        fontSize: 14,
        fontWeight: 'bold',
    },
    themeTextSelected: {
        color: theme.white,
    },
    saveButton: {
        backgroundColor: theme.solidBlue,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    });
}

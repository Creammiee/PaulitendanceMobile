import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { useThemeContext } from '../../ctx/ThemeContext';
import { db, storage } from '../../lib/firebaseConfig';
import { UserProfile } from '../../types/db';

export default function StudentProfileScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    const { user, signOut } = useAuth();
    const { themeMode, setThemeMode } = useThemeContext();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        if (!user) return;
        setUploading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storageRef = ref(storage, `profiles/${user.uid}.jpg`);
            
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { profilePicture: downloadURL });
            
            setProfile(prev => prev ? { ...prev, profilePicture: downloadURL } : null);
            Alert.alert('Success', 'Profile picture updated!');
        } catch (error) {
            console.error("Error uploading image:", error);
            Alert.alert('Error', 'Failed to upload image.');
        } finally {
            setUploading(false);
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
                <Text style={styles.title}>My Profile</Text>
                <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={20} color={theme.error} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            {/* Profile Picture Section */}
            <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={pickImage} disabled={uploading}>
                    <View style={styles.imageWrapper}>
                        {profile?.profilePicture ? (
                            <Image source={{ uri: profile.profilePicture }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Ionicons name="person" size={50} color={theme.lilacBlue} />
                            </View>
                        )}
                        {uploading && (
                            <View style={styles.uploadOverlay}>
                                <ActivityIndicator color={theme.white} />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={16} color={theme.white} />
                        </View>
                    </View>
                </TouchableOpacity>
                <Text style={styles.userName}>{profile?.fullName}</Text>
                <Text style={styles.userEmail}>{profile?.email}</Text>
                {profile?.section && (
                    <View style={styles.sectionBadge}>
                        <Text style={styles.sectionText}>Section: {profile.section}</Text>
                    </View>
                )}
            </View>

            {/* App Appearance Section */}
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

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="card-outline" size={20} color={theme.lilacBlue} />
                    <Text style={styles.infoLabel}>Student ID</Text>
                    <Text style={styles.infoValue}>{profile?.uid.substring(0, 8).toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color={theme.lilacBlue} />
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>{profile?.role?.toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.lilacBlue} />
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[styles.infoValue, { color: profile?.status === 'active' ? '#4CAF50' : '#FFA500' }]}>
                        {profile?.status?.toUpperCase() || 'ACTIVE'}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={theme.lilacBlue} />
                    <Text style={styles.infoLabel}>Joined</Text>
                    <Text style={styles.infoValue}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Ionicons name="key-outline" size={20} color={theme.lilacBlue} />
                    <Text style={styles.infoLabel}>Binding Key</Text>
                    <Text style={styles.infoValue}>{profile?.bindingKey || 'N/A'}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        content: {
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
        logoutBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        logoutText: {
            color: theme.error,
            fontWeight: 'bold',
        },
        avatarContainer: {
            alignItems: 'center',
            marginBottom: 30,
        },
        imageWrapper: {
            position: 'relative',
        },
        avatar: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: theme.card,
            borderWidth: 3,
            borderColor: theme.solidBlue,
        },
        placeholderAvatar: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        uploadOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 60,
            justifyContent: 'center',
            alignItems: 'center',
        },
        editBadge: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: theme.solidBlue,
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.background,
        },
        userName: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.text,
            marginTop: 16,
        },
        userEmail: {
            fontSize: 14,
            color: theme.lilacBlue,
            marginTop: 4,
        },
        sectionBadge: {
            backgroundColor: theme.solidBlue + '20',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
            marginTop: 8,
        },
        sectionText: {
            color: theme.solidBlue,
            fontWeight: 'bold',
            fontSize: 12,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 16,
        },
        themeContainer: {
            flexDirection: 'row',
            gap: 10,
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
        infoCard: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.sailingBlue,
        },
        infoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.sailingBlue,
        },
        infoLabel: {
            flex: 1,
            marginLeft: 12,
            color: theme.lilacBlue,
            fontSize: 14,
        },
        infoValue: {
            color: theme.text,
            fontWeight: 'bold',
            fontSize: 14,
        }
    });
}

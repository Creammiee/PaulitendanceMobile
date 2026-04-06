import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ColorTheme } from '../constants/Colors';
import { useAuth } from '../ctx/AuthContext';

export default function PendingScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const { signOut } = useAuth();

    return (
        <View style={styles.container}>
            <Ionicons name="hourglass-outline" size={100} color={theme.lilacBlue} style={styles.icon} />
            <Text style={styles.title}>Account Pending</Text>
            <Text style={styles.subtitle}>
                Your account has been successfully created and is currently waiting for admin approval. 
                Please check back later or contact your school administrator.
            </Text>

            <TouchableOpacity style={styles.button} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color={theme.white} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.nightTime,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.white,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: theme.lilacBlue,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: theme.solidBlue,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    });
}

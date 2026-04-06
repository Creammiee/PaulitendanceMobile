import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';

export default function ParentDashboard() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const { signOut, user } = useAuth();
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Parent Portal</Text>
                <Ionicons name="log-out-outline" size={24} color={theme.white} onPress={signOut} />
            </View>
            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome, Parent!</Text>
                <Text style={styles.emailText}>{user?.email}</Text>

                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(parent)/map' as any)}
                    >
                        <Ionicons name="map" size={32} color={theme.white} />
                        <Text style={styles.menuText}>Track Child</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(parent)/child-status' as any)}
                    >
                        <Ionicons name="clipboard" size={32} color={theme.white} />
                        <Text style={styles.menuText}>Attendance & Letters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.nightTime,
        padding: 20,
        paddingTop: 60,
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
        color: theme.white,
    },
    content: {
        flex: 1,
        // justifyContent: 'center', 
        alignItems: 'center',
        marginTop: 50,
    },
    welcomeText: {
        fontSize: 24,
        color: theme.white,
        marginBottom: 10,
    },
    emailText: {
        fontSize: 16,
        color: theme.lilacBlue,
        marginBottom: 40,
    },
    menuContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 20,
    },
    menuItem: {
        backgroundColor: theme.solidBlue,
        width: 140,
        height: 140,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuText: {
        color: theme.white,
        marginTop: 10,
        fontWeight: 'bold',
        fontSize: 16,
    }
    });
}

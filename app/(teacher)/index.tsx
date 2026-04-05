import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';

export default function TeacherDashboard() {
    const { signOut, user } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Teacher Portal</Text>
                <Ionicons name="log-out-outline" size={24} color={Colors.white} onPress={signOut} />
            </View>
            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome, Teacher!</Text>
                <Text style={styles.emailText}>{user?.email}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.nightTime,
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
        color: Colors.white,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 24,
        color: Colors.white,
        marginBottom: 10,
    },
    emailText: {
        fontSize: 16,
        color: Colors.lilacBlue,
    }
});

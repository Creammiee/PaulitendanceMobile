import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.nightTime,
                    borderTopColor: Colors.sailingBlue,
                },
                tabBarActiveTintColor: Colors.solidBlue,
                tabBarInactiveTintColor: Colors.lilacBlue,
            }}
        >
            <Tabs.Screen
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }: { color: string }) => <Ionicons name="book" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="attendance"
                options={{
                    title: 'Attendance',
                    tabBarIcon: ({ color }: { color: string }) => <Ionicons name="clipboard-outline" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="letters"
                options={{
                    title: 'Letters',
                    tabBarIcon: ({ color }: { color: string }) => <Ionicons name="mail-outline" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }: { color: string }) => <Ionicons name="settings-outline" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}

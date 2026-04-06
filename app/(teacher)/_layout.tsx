import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAppTheme } from '../../hooks/useAppTheme';


export default function TabLayout() {
    const theme = useAppTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.nightTime,
                    borderTopColor: theme.sailingBlue,
                },
                tabBarActiveTintColor: theme.solidBlue,
                tabBarInactiveTintColor: theme.lilacBlue,
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

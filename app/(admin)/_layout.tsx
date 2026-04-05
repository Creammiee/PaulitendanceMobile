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
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
                }}
            />
            {/* Add more tabs here later */}
        </Tabs>
    );
}

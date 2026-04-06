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
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
                }}
            />
             <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="child-status"
                options={{
                    title: 'Status',
                    tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}

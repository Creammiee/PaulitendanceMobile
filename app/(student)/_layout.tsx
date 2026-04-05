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
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Ionicons name="school" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}

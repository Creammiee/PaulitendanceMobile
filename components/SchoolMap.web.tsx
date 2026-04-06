import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const MapMarker = ({ coordinate, title, description, pinColor }: any) => null;

interface SchoolMapProps {
    children?: React.ReactNode;
}

export default function SchoolMap({ children }: SchoolMapProps) {
    return (
        <View style={styles.container}>
            <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>Map is not supported on Web</Text>
            </View>
            {/* We don't render children (Markers) on Web to avoid errors */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e6e6e6',
    },
    fallbackText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    },
});

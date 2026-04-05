import { SCHOOL_LOCATION } from '@/lib/location';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface SchoolMapProps {
    children?: React.ReactNode;
}

export default function SchoolMap({ children }: SchoolMapProps) {
    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    ...SCHOOL_LOCATION,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation
                showsMyLocationButton
            >
                <Marker
                    coordinate={SCHOOL_LOCATION}
                    title="Paulitendance School"
                    description="School Location"
                    pinColor="blue"
                />
                {children}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
});

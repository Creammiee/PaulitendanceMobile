import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SchoolMap, { MapMarker } from '../../components/SchoolMap';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { requestLocationPermissions, updateStudentLocation } from '../../lib/location';

export default function StudentMap() {
    const { user } = useAuth();
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);

    useEffect(() => {
        (async () => {
            const hasPermission = await requestLocationPermissions();
            if (!hasPermission) {
                Alert.alert("Permission denied", "Location permission is required to share your location.");
                return;
            }

            // Get initial location
            const current = await Location.getCurrentPositionAsync({});
            setLocation(current.coords);
            if (user) {
                updateStudentLocation(user.uid, current.coords);
            }

            const subscriber = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setLocation(newLocation.coords);
                    if (user) {
                        updateStudentLocation(user.uid, newLocation.coords);
                    }
                }
            );

            return () => {
                subscriber.remove();
            };
        })();
    }, [user]);

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>

            <SchoolMap>
                {location && (
                    <MapMarker
                        coordinate={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                        }}
                        title="Me"
                        description="My current location"
                        pinColor="green"
                    />
                )}
            </SchoolMap>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>Sharing location with parents...</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 20,
        elevation: 5,
    },
    infoBox: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: Colors.white,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 5,
    },
    infoText: {
        color: Colors.nightTime,
        fontWeight: 'bold',
    }
});

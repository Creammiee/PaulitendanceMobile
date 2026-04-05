import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Marker } from 'react-native-maps';
import SchoolMap from '../../components/SchoolMap';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../ctx/AuthContext';
import { firebaseApp } from '../../lib/firebaseConfig';
import { LocationCoords, subscribeToStudentLocation } from '../../lib/location';

const db = getFirestore(firebaseApp);

export default function ParentMap() {
    const { user } = useAuth();
    const router = useRouter();
    const [childLocation, setChildLocation] = useState<LocationCoords | null>(null);
    const [loading, setLoading] = useState(true);
    const [childId, setChildId] = useState<string | null>(null);

    useEffect(() => {
        const fetchChild = async () => {
            if (!user) return;
            try {
                // Fetch parent doc to find linked child
                const parentDoc = await getDoc(doc(db, 'parents', user.uid));
                if (parentDoc.exists()) {
                    const data = parentDoc.data();
                    if (data.childId) {
                        setChildId(data.childId);
                    } else {
                        console.log("No childId found for this parent");
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Error fetching child:", err);
                setLoading(false);
            }
        };

        fetchChild();
    }, [user]);

    useEffect(() => {
        if (!childId) return;

        const unsubscribe = subscribeToStudentLocation(childId, (coords) => {
            setChildLocation(coords);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [childId]);

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>

            <SchoolMap>
                {childLocation && (
                    <Marker
                        coordinate={{
                            latitude: childLocation.latitude,
                            longitude: childLocation.longitude,
                        }}
                        title="My Child"
                        description="Current location"
                        pinColor="orange"
                    />
                )}
            </SchoolMap>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.solidBlue} />
                    <Text style={{ color: 'white', marginTop: 10 }}>Locating child...</Text>
                </View>
            )}

            {!loading && !childLocation && childId && (
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>Child location not available yet.</Text>
                </View>
            )}

            {!loading && !childId && (
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>No child linked to this account.</Text>
                </View>
            )}
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
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

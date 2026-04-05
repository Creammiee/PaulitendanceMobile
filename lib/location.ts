import * as Location from 'expo-location';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { SchoolSettings } from '../types/db';
import { db } from './firebaseConfig';

export interface LocationCoords {
    latitude: number;
    longitude: number;
}

// Default school location (can be overridden from Firebase settings)
export const SCHOOL_LOCATION: LocationCoords = {
    latitude: 0,
    longitude: 0,
};

// Function to calculate distance between two coordinates in meters (Haversine formula)
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export const requestLocationPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
};

export const getCurrentLocation = async (): Promise<LocationCoords | null> => {
    try {
        const { coords } = await Location.getCurrentPositionAsync({});
        return {
            latitude: coords.latitude,
            longitude: coords.longitude,
        };
    } catch (error) {
        console.error("Error getting location:", error);
        return null;
    }
};

export const checkAttendanceStatus = async (studentId: string) => {
    try {
        // 1. Get School Configuration
        const settingsRef = doc(db, 'settings', 'schoolConfig');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            console.error("School settings not found!");
            return;
        }

        const settings = settingsSnap.data() as SchoolSettings;
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, etc.

        // 2. Check if today is a school day
        if (!settings.schoolDays.includes(dayOfWeek)) {
            console.log("Not a school day.");
            return;
        }

        // 3. Check Time (Simple check: if current time > schoolStartTime)
        // Format of schoolStartTime is "HH:mm"
        const [startHour, startMinute] = settings.schoolStartTime.split(':').map(Number);
        const schoolStart = new Date();
        schoolStart.setHours(startHour, startMinute, 0, 0);

        if (now < schoolStart) {
            // Too early to mark late, but could mark present if within range?
            // For this logic, we are specifically checking for "Late" on app open if time passed.
            // Or "Present" if they are here on time.
            // Let's implement a simple "Check In" login.
        }

        // 4. Get Student Location
        const studentLocation = await getCurrentLocation();
        if (!studentLocation) {
            console.log("Could not get student location.");
            return;
        }

        // 5. Calculate Distance
        const distance = getDistanceFromLatLonInMeters(
            studentLocation.latitude,
            studentLocation.longitude,
            settings.schoolLocation.latitude,
            settings.schoolLocation.longitude
        );

        console.log(`Distance to school: ${distance} meters. Max radius: ${settings.schoolLocation.radius}`);

        // 6. Mark Attendance
        const todayStr = now.toISOString().split('T')[0];
        const attendanceRef = doc(db, 'attendance', `${studentId}_${todayStr}`);
        const attendanceSnap = await getDoc(attendanceRef);

        if (attendanceSnap.exists()) {
            console.log("Attendance already marked for today.");
            return;
        }

        // Logic:
        // If within radius -> PRESENT
        // If outside radius AND time > start time -> LATE
        // If outside radius AND time < start time -> Do nothing (waiting for them to arrive)

        if (distance <= settings.schoolLocation.radius) {
            // They are at school!
            let status: 'present' | 'late' = 'present';
            if (now > schoolStart) {
                status = 'late';
            }

            await setDoc(attendanceRef, {
                id: `${studentId}_${todayStr}`,
                studentId: studentId,
                date: todayStr,
                status: status,
                timeIn: now.toISOString(),
                markedBy: 'system'
            });
            console.log(`Marked ${status} via system.`);

        } else if (now > schoolStart) {
            // They are NOT at school and it is past start time -> LATE
            // But maybe they are just absent? We can mark them late for now as "Not here yet"
            // Or we only mark LATE when they actually arrive?
            // The user request said: "it will imidiately mark late if the student is not on the map of the school"
            // Implies: If I open the app at 8:01 AM and I am at home -> Marked Late.

            await setDoc(attendanceRef, {
                id: `${studentId}_${todayStr}`,
                studentId: studentId,
                date: todayStr,
                status: 'late',
                timeIn: now.toISOString(), // Time they checked (even if not at school)
                markedBy: 'system'
            });
            console.log("Marked LATE via system (not at school after start time).");
        }

    } catch (error) {
        console.error("Error checking attendance:", error);
    }
}

export const subscribeToStudentLocation = (studentId: string, callback: (location: LocationCoords) => void) => {
    const locationRef = doc(db, 'locations', studentId);
    return onSnapshot(locationRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.latitude && data.longitude) {
                callback({
                    latitude: data.latitude,
                    longitude: data.longitude
                });
            }
        }
    });
};

export const updateStudentLocation = async (studentId: string, coords: LocationCoords) => {
    try {
        const locationRef = doc(db, 'locations', studentId);
        await setDoc(locationRef, {
            latitude: coords.latitude,
            longitude: coords.longitude,
            lastUpdated: new Date().toISOString(),
        }, { merge: true });
    } catch (error) {
        console.error("Error updating location:", error);
    }
};

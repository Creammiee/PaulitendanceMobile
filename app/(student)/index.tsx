import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../ctx/AuthContext";
import { db } from "../../lib/firebaseConfig";
import { checkAttendanceStatus } from "../../lib/location";
import { Attendance, Letter } from "../../types/db";

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      // Fetch full student profile
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          setStudentProfile(snap.data());
        }
      });

      // Real-time listener for attendance
      const todayStr = new Date().toISOString().split("T")[0];
      const attendanceRef = doc(db, "attendance", `${user.uid}_${todayStr}`);

      const unsubAttendance = onSnapshot(attendanceRef, (docSnap) => {
        if (docSnap.exists()) {
          setAttendance(docSnap.data() as Attendance);
        } else {
          setAttendance(null);
        }
      });

      // Real-time listener for letters
      const q = query(
        collection(db, "letters"),
        where("studentId", "==", user.uid),
      );
      const unsubLetters = onSnapshot(q, (snapshot) => {
        const lettersList: Letter[] = [];
        snapshot.forEach((d) => lettersList.push(d.data() as Letter));
        // Sort locally since firestore requires index for orderBy
        lettersList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setLetters(lettersList);
      });

      // Initial check for attendance via location
      performAttendanceCheck();

      setLoading(false);
      return () => {
        unsubAttendance();
        unsubLetters();
      };
    }
  }, [user]);

  const performAttendanceCheck = async () => {
    if (!user) return;
    setCheckingLocation(true);
    try {
      await checkAttendanceStatus(user.uid);
      // The listener will update the UI if status changes
    } catch (error) {
      console.error("Error checking attendance:", error);
    } finally {
      setCheckingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.lilacBlue} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Attendance</Text>
          {studentProfile && (
            <View>
              <Text style={styles.sectionText}>
                {studentProfile.section || "No Section"}
              </Text>
              <View style={styles.keyContainer}>
                <Text style={styles.keyLabel}>Parent Binding Key:</Text>
                <Text style={styles.keyText}>
                  {studentProfile.bindingKey || "N/A"}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Ionicons
          name="log-out-outline"
          size={24}
          color={Colors.white}
          onPress={signOut}
        />
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.subtitle}>Today\u2019s Status</Text>

        {attendance ? (
          <View
            style={[
              styles.statusCard,
              attendance.status === "present"
                ? styles.statusGreen
                : attendance.status === "late"
                  ? styles.statusOrange
                  : attendance.status === "absent"
                    ? styles.statusRed
                    : styles.statusGray,
            ]}
          >
            <Ionicons
              name={
                attendance.status === "present"
                  ? "checkmark-circle"
                  : attendance.status === "late"
                    ? "time"
                    : "close-circle"
              }
              size={64}
              color={Colors.white}
            />
            <Text style={styles.statusText}>
              {attendance.status.toUpperCase()}
            </Text>
            <Text style={styles.timeText}>
              Time In:{" "}
              {new Date(attendance.timeIn!).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ) : (
          <View style={styles.statusCard}>
            {checkingLocation ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Ionicons
                name="location-outline"
                size={64}
                color={Colors.lilacBlue}
              />
            )}
            <Text style={styles.statusText}>Checking In...</Text>
            <Text style={styles.timeText}>Verifying location...</Text>

            {!checkingLocation && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={performAttendanceCheck}
              >
                <Text style={styles.retryText}>Check Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.lettersSection}>
        <Text style={styles.subtitle}>My Letters</Text>
        {letters.length === 0 ? (
          <Text style={styles.emptyText}>No letters.</Text>
        ) : (
          letters.map((letter) => (
            <View key={letter.id} style={styles.letterCard}>
              <View style={styles.letterHeader}>
                <Text style={styles.letterType}>
                  {letter.type.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.letterStatus,
                    letter.status === "approved"
                      ? styles.textGreen
                      : letter.status === "rejected"
                        ? styles.textRed
                        : styles.textOrange,
                  ]}
                >
                  {letter.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.letterDate}>{letter.date}</Text>
              <Text style={styles.letterReason}>{letter.reason}</Text>

              {letter.type === "promissory" && (
                <View style={styles.approvals}>
                  <Text style={styles.approvalText}>
                    Parent: {letter.parentApproved ? "Approved" : "Pending"}
                  </Text>
                  <Text style={styles.approvalText}>
                    Teacher: {letter.teacherApproved ? "Approved" : "Pending"}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nightTime,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.nightTime,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
  },
  sectionText: {
    color: Colors.lilacBlue,
    fontSize: 16,
    marginTop: 4,
  },
  keyContainer: {
    marginTop: 8,
    backgroundColor: Colors.deepSea,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
    alignSelf: "flex-start",
  },
  keyLabel: {
    color: Colors.lilacBlue,
    fontSize: 10,
    marginBottom: 2,
  },
  keyText: {
    color: Colors.solidBlue,
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.lilacBlue,
    marginBottom: 16,
  },
  statusSection: {
    marginBottom: 40,
    alignItems: "center",
  },
  statusCard: {
    width: "100%",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: Colors.deepSea,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
  },
  statusGreen: { backgroundColor: "#4CAF50" },
  statusOrange: { backgroundColor: "#FFA500" },
  statusRed: { backgroundColor: Colors.error },
  statusGray: { backgroundColor: Colors.deepSea },

  statusText: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginVertical: 10,
  },
  timeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: Colors.white,
    fontWeight: "bold",
  },

  lettersSection: {
    width: "100%",
  },
  letterCard: {
    backgroundColor: Colors.deepSea,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
  },
  letterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  letterType: {
    color: Colors.dive,
    fontWeight: "bold",
  },
  letterStatus: {
    fontWeight: "bold",
  },
  textGreen: { color: "#4CAF50" },
  textRed: { color: Colors.error },
  textOrange: { color: "#FFA500" },
  letterDate: {
    color: Colors.lilacBlue,
    fontSize: 12,
    marginBottom: 8,
  },
  letterReason: {
    color: Colors.white,
    fontSize: 14,
    marginBottom: 12,
  },
  approvals: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 8,
  },
  approvalText: {
    color: Colors.lilacBlue,
    fontSize: 12,
  },
  emptyText: {
    color: Colors.lilacBlue,
    fontStyle: "italic",
    textAlign: "center",
  },
});

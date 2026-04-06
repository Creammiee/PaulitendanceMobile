import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { useAuth } from "../../ctx/AuthContext";
import { db } from "../../lib/firebaseConfig";
import { checkAttendanceStatus } from "../../lib/location";
import { Attendance, Letter } from "../../types/db";

export default function StudentDashboard() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

  const { signOut, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  // Promissory Note States
  const [modalVisible, setModalVisible] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [updating, setUpdating] = useState(false);

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
    } catch (error) {
      console.error("Error checking attendance:", error);
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleUpdateReason = async () => {
    if (!selectedLetter || !reasonInput.trim()) {
        Alert.alert("Error", "Please provide a reason.");
        return;
    }

    setUpdating(true);
    try {
        const letterRef = doc(db, "letters", selectedLetter.id);
        await updateDoc(letterRef, {
            reason: reasonInput,
        });
        setModalVisible(false);
        Alert.alert("Success", "Explanation submitted for review.");
    } catch (error) {
        console.error("Error updating reason:", error);
        Alert.alert("Error", "Failed to update reason.");
    } finally {
        setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.lilacBlue} />
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
          color={theme.white}
          onPress={signOut}
        />
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.subtitle}>Today’s Status</Text>

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
              color={theme.white}
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
              <ActivityIndicator color={theme.white} />
            ) : (
              <Ionicons
                name="location-outline"
                size={64}
                color={theme.lilacBlue}
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

              {letter.status === "pending" && (
                <TouchableOpacity 
                    style={styles.submitReasonBtn}
                    onPress={() => {
                        setSelectedLetter(letter);
                        setReasonInput(letter.reason === 'Late arrival' ? '' : letter.reason);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.submitReasonText}>
                        {letter.reason === 'Late arrival' ? 'Submit Reason' : 'Update Reason'}
                    </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Promissory Note</Text>
                    <Ionicons 
                        name="close" 
                        size={24} 
                        color={theme.white} 
                        onPress={() => setModalVisible(false)} 
                    />
                </View>
                <Text style={styles.modalLabel}>Why are you arriving late?</Text>
                <TextInput
                    style={styles.reasonInput}
                    placeholder="Enter your excuse here..."
                    placeholderTextColor={theme.lilacBlue}
                    multiline
                    numberOfLines={4}
                    value={reasonInput}
                    onChangeText={setReasonInput}
                />
                <TouchableOpacity 
                    style={styles.saveBtn}
                    onPress={handleUpdateReason}
                    disabled={updating}
                >
                    {updating ? (
                        <ActivityIndicator color={theme.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>Submit Explanation</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.nightTime,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.nightTime,
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
    color: theme.white,
  },
  sectionText: {
    color: theme.lilacBlue,
    fontSize: 16,
    marginTop: 4,
  },
  keyContainer: {
    marginTop: 8,
    backgroundColor: theme.deepSea,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
    alignSelf: "flex-start",
  },
  keyLabel: {
    color: theme.lilacBlue,
    fontSize: 10,
    marginBottom: 2,
  },
  keyText: {
    color: theme.solidBlue,
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.lilacBlue,
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
    backgroundColor: theme.deepSea,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
  },
  statusGreen: { backgroundColor: "#4CAF50" },
  statusOrange: { backgroundColor: "#FFA500" },
  statusRed: { backgroundColor: theme.error },
  statusGray: { backgroundColor: theme.deepSea },

  statusText: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.white,
    marginVertical: 10,
  },
  timeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: theme.solidBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: theme.white,
    fontWeight: "bold",
  },

  lettersSection: {
    width: "100%",
  },
  letterCard: {
    backgroundColor: theme.deepSea,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
  },
  letterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  letterType: {
    color: theme.dive,
    fontWeight: "bold",
  },
  letterStatus: {
    fontWeight: "bold",
  },
  textGreen: { color: "#4CAF50" },
  textRed: { color: theme.error },
  textOrange: { color: "#FFA500" },
  letterDate: {
    color: theme.lilacBlue,
    fontSize: 12,
    marginBottom: 8,
  },
  letterReason: {
    color: theme.white,
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
    color: theme.lilacBlue,
    fontSize: 12,
  },
  emptyText: {
    color: theme.lilacBlue,
    fontStyle: "italic",
    textAlign: "center",
  },
  submitReasonBtn: {
    backgroundColor: theme.solidBlue,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitReasonText: {
    color: theme.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.nightTime,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: theme.sailingBlue,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.white,
  },
  modalLabel: {
    color: theme.lilacBlue,
    fontSize: 14,
    marginBottom: 10,
  },
  reasonInput: {
    backgroundColor: theme.deepSea,
    color: theme.white,
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: theme.solidBlue,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "bold",
  },
    });
}

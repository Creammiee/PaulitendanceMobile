import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
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
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../ctx/AuthContext";
import { db } from "../../lib/firebaseConfig";
import { Attendance, Letter, UserProfile } from "../../types/db";

export default function ChildStatusScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(
    null,
  );
  const [letters, setLetters] = useState<Letter[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal for Excuse Letter
  const [showExcuseModal, setShowExcuseModal] = useState(false);
  const [excuseReason, setExcuseReason] = useState("");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Get Parent Profile to find Student ID
      const parentRef = doc(db, "users", user.uid); // Try users collection first? Or parents?
      // AuthContext says parents are in 'parents' collection usually.
      // But our seed script put them in 'users'.
      // Let's try 'users' first as per my seed script.
      let parentSnap = await getDoc(parentRef);

      // If not in users, check parents (legacy/other flow)
      if (!parentSnap.exists()) {
        const pRef = doc(db, "parents", user.uid);
        parentSnap = await getDoc(pRef);
      }

      if (!parentSnap.exists()) {
        console.error("Parent profile not found found.");
        setLoading(false);
        return;
      }

      const parentData = parentSnap.data() as UserProfile;
      if (!parentData.studentIds || parentData.studentIds.length === 0) {
        Alert.alert("Info", "No students linked to this parent account.");
        setLoading(false);
        return;
      }

      const studentId = parentData.studentIds[0]; // Take first student

      // 2. Get Student Profile
      const studentSnap = await getDoc(doc(db, "users", studentId));
      if (studentSnap.exists()) {
        setStudent(studentSnap.data() as UserProfile);
      }

      // 3. Get Today's Attendance
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const attendanceRef = doc(db, "attendance", `${studentId}_${todayStr}`);
      const attendanceSnap = await getDoc(attendanceRef);
      if (attendanceSnap.exists()) {
        setTodayAttendance(attendanceSnap.data() as Attendance);
      }

      // 4. Get Letters (Pending Promissory OR any recent letters)
      // Let's fetch all relevant letters for this student
      const q = query(
        collection(db, "letters"),
        where("studentId", "==", studentId),
      );
      const lettersSnap = await getDocs(q);
      const lettersList: Letter[] = [];
      lettersSnap.forEach((d) => lettersList.push(d.data() as Letter));

      // Sort by date desc
      lettersList.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setLetters(lettersList);
    } catch (error) {
      console.error("Error loading child data:", error);
      Alert.alert("Error", "Failed to load child data.");
    } finally {
      setLoading(false);
    }
  };

  const approvePromissory = async (letter: Letter) => {
    setProcessing(letter.id);
    try {
      const letterRef = doc(db, "letters", letter.id);

      // Check if teacher verified already?
      let newStatus = letter.status;
      if (letter.teacherApproved) {
        newStatus = "approved";
      }

      await updateDoc(letterRef, {
        parentApproved: true,
        status: newStatus,
      });
      Alert.alert("Success", "Promissory note approved.");
      loadData();
    } catch (error) {
      console.error("Error approving letter:", error);
      Alert.alert("Error", "Failed to approve letter.");
    } finally {
      setProcessing(null);
    }
  };

  const submitExcuseLetter = async () => {
    if (!excuseReason.trim() || !student) {
      Alert.alert("Error", "Please enter a reason.");
      return;
    }
    setProcessing("submitting");
    try {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const letterId = `excuse_${student.uid}_${todayStr}_${now.getTime()}`;

      const letterData: Letter = {
        id: letterId,
        type: "excuse",
        studentId: student.uid,
        date: todayStr, // Applying for today? Or should we pick date? Assuming today for MVP.
        reason: excuseReason,
        status: "pending",
        teacherApproved: false,
        createdAt: now.toISOString(),
      };

      await setDoc(doc(db, "letters", letterId), letterData);
      Alert.alert("Success", "Excuse letter sent to teacher.");
      setShowExcuseModal(false);
      setExcuseReason("");
      loadData();
    } catch (error) {
      console.error("Error submitting excuse:", error);
      Alert.alert("Error", "Failed to submit excuse letter.");
    } finally {
      setProcessing(null);
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Child Status</Text>
      </View>

      {student && (
        <View style={styles.studentHeader}>
          <Text style={styles.studentName}>{student.fullName}</Text>
          <Text style={styles.studentRole}>Student</Text>
        </View>
      )}

      {/* Attendance Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today\u2019s Attendance</Text>
        <View
          style={[
            styles.statusCard,
            todayAttendance?.status === "present"
              ? styles.statusGreen
              : todayAttendance?.status === "late"
                ? styles.statusOrange
                : todayAttendance?.status === "absent"
                  ? styles.statusRed
                  : styles.statusGray,
          ]}
        >
          <Text style={styles.statusText}>
            {todayAttendance
              ? todayAttendance.status.toUpperCase()
              : "NO RECORD"}
          </Text>
          {todayAttendance?.timeIn && (
            <Text style={styles.timeText}>
              Time:{" "}
              {new Date(todayAttendance.timeIn).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>

        {/* Actions based on status */}
        {todayAttendance?.status === "absent" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowExcuseModal(true)}
          >
            <Text style={styles.actionButtonText}>Submit Excuse Letter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Letters Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Letters & Notes</Text>
        {letters.length === 0 ? (
          <Text style={styles.emptyText}>No letters found.</Text>
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
              <Text style={styles.letterReason}>
                \u201c{letter.reason}\u201d
              </Text>

              {/* Promissory Approval */}
              {letter.type === "promissory" && !letter.parentApproved && (
                <View style={styles.approvalSection}>
                  <Text style={styles.approvalText}>
                    Please acknowledge this lateness:
                  </Text>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => approvePromissory(letter)}
                    disabled={processing === letter.id}
                  >
                    <Text style={styles.approveButtonText}>
                      Approve / Acknowledge
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {letter.type === "promissory" && letter.parentApproved && (
                <Text style={styles.approvedText}>
                  ✓ You have approved this.
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Excuse Modal */}
      <Modal visible={showExcuseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excuse Letter</Text>
            <Text style={styles.modalSubtitle}>
              Reason for absence on {new Date().toLocaleDateString()}:
            </Text>

            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              value={excuseReason}
              onChangeText={setExcuseReason}
              placeholder="My child was sick..."
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowExcuseModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={submitExcuseLetter}
                disabled={processing === "submitting"}
              >
                <Text style={styles.modalBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
  },
  studentHeader: {
    marginBottom: 30,
  },
  studentName: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.dive,
  },
  studentRole: {
    color: Colors.lilacBlue,
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 12,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  statusGreen: { backgroundColor: "#4CAF50" },
  statusOrange: { backgroundColor: "#FFA500" },
  statusRed: { backgroundColor: Colors.error },
  statusGray: {
    backgroundColor: Colors.deepSea,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
  },

  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 4,
  },
  timeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: Colors.solidBlue,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },

  // Letter Styles
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
    fontStyle: "italic",
    marginBottom: 12,
  },
  approvalSection: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 12,
  },
  approvalText: {
    color: Colors.lilacBlue,
    marginBottom: 8,
  },
  approveButton: {
    backgroundColor: Colors.solidBlue,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButtonText: {
    color: Colors.white,
    fontWeight: "bold",
  },
  approvedText: {
    color: "#4CAF50",
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    color: Colors.lilacBlue,
    fontStyle: "italic",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.nightTime,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: Colors.lilacBlue,
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: Colors.deepSea,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
    borderRadius: 8,
    padding: 12,
    height: 100, // multiline
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: "transparent",
  },
  submitBtn: {
    backgroundColor: Colors.solidBlue,
  },
  modalBtnText: {
    color: Colors.white,
    fontWeight: "bold",
  },
});

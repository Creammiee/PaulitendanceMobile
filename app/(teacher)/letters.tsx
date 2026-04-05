import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { db } from "../../lib/firebaseConfig";
import { Letter, UserProfile } from "../../types/db";

interface LetterWithStudent extends Letter {
  studentName: string;
}

export default function TeacherLettersScreen() {
  const [letters, setLetters] = useState<LetterWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = async () => {
    try {
      // Fetch pending letters
      // For MVP, fetch all pending. In real app, filter by assigned students.
      const q = query(
        collection(db, "letters"),
        where("status", "==", "pending"),
      );
      const querySnapshot = await getDocs(q);

      const lettersData: LetterWithStudent[] = [];

      for (const docSnap of querySnapshot.docs) {
        const letter = docSnap.data() as Letter;

        // Fetch student name
        const studentRef = doc(db, "users", letter.studentId);
        const studentSnap = await getDoc(studentRef);
        const studentName = studentSnap.exists()
          ? (studentSnap.data() as UserProfile).fullName
          : "Unknown Student";

        lettersData.push({ ...letter, studentName });
      }

      setLetters(lettersData);
    } catch (error) {
      console.error("Error loading letters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (letter: Letter, action: "approve" | "reject") => {
    setProcessing(letter.id);
    try {
      const letterRef = doc(db, "letters", letter.id);

      if (action === "approve") {
        // If Promissory, need Parent Approval first?
        // User said: "sent to the teacher to approve and the parent"
        // Usually order implies concurrent or parent first.
        // Let's assume Teacher can approve anytime, but "Fully Approved" requires both.

        // If Excuse letter (absent), usually just Teacher approves.

        let updates: any = {
          teacherApproved: true,
        };

        if (letter.type === "excuse") {
          updates.status = "approved";
        } else if (letter.type === "promissory") {
          // Check if parent already approved
          if (letter.parentApproved) {
            updates.status = "approved";
          } else {
            // Still pending parent
            // updates.status remains pending
          }
        }

        await updateDoc(letterRef, updates);
        Alert.alert("Success", "Letter approved.");
      } else {
        await updateDoc(letterRef, {
          status: "rejected",
        });
        Alert.alert("Rejected", "Letter rejected.");
      }

      loadLetters(); // Refresh list
    } catch (error) {
      console.error("Error processing letter:", error);
      Alert.alert("Error", "Failed to process letter.");
    } finally {
      setProcessing(null);
    }
  };

  const renderLetterItem = ({ item }: { item: LetterWithStudent }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </View>

      <Text style={styles.studentName}>{item.studentName}</Text>
      <Text style={styles.reason}>\u201c{item.reason}\u201d</Text>

      {item.type === "promissory" && (
        <View style={styles.statusRow}>
          <Text
            style={
              item.parentApproved ? styles.statusApproved : styles.statusPending
            }
          >
            Parent: {item.parentApproved ? "Approved" : "Pending"}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => handleAction(item, "reject")}
          disabled={processing === item.id}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.approveBtn]}
          onPress={() => handleAction(item, "approve")}
          disabled={processing === item.id}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.lilacBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Letters</Text>
      </View>
      <FlatList
        data={letters}
        keyExtractor={(item) => item.id}
        renderItem={renderLetterItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No pending letters.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nightTime,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.nightTime,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.deepSea,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.sailingBlue,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: Colors.dive,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  date: {
    color: Colors.lilacBlue,
    fontSize: 12,
  },
  studentName: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reason: {
    color: Colors.lilacBlue,
    fontStyle: "italic",
    marginBottom: 12,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusApproved: {
    color: "#4CAF50", // Green
    fontWeight: "bold",
    fontSize: 12,
  },
  statusPending: {
    color: "#FFA500", // Orange
    fontWeight: "bold",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
  },
  approveBtn: {
    backgroundColor: Colors.solidBlue,
  },
  btnText: {
    color: Colors.white,
    fontWeight: "bold",
  },
  emptyText: {
    color: Colors.lilacBlue,
    textAlign: "center",
    marginTop: 40,
  },
});

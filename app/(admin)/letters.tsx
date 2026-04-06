import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where,
    orderBy,
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
import { useAppTheme } from '../../hooks/useAppTheme';
import { ColorTheme } from '../../constants/Colors';
import { db } from "../../lib/firebaseConfig";
import { Letter, UserProfile } from "../../types/db";

interface LetterWithStudent extends Letter {
  studentName: string;
}

export default function AdminLettersScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const [letters, setLetters] = useState<LetterWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    const lettersQuery = query(collection(db, 'letters'));
    
    const unsubscribe = onSnapshot(lettersQuery, async (snapshot) => {
        const lettersList: LetterWithStudent[] = [];
        for (const docSnap of snapshot.docs) {
            const letter = docSnap.data() as Letter;
            
            // Fetch student name
            const studentRef = doc(db, "users", letter.studentId);
            const studentSnap = await getDoc(studentRef);
            const studentName = studentSnap.exists()
              ? (studentSnap.data() as UserProfile).fullName
              : "Unknown Student";

            lettersList.push({ ...letter, studentName });
        }
        
        // Sort locally
        lettersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLetters(lettersList);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLetters = letters.filter(l => filter === 'all' || l.status === filter);

  const renderLetterItem = ({ item }: { item: LetterWithStudent }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'excuse' ? theme.dive : theme.solidBlue }]}>
          <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { 
            backgroundColor: item.status === 'approved' ? '#4CAF50' : item.status === 'rejected' ? theme.error : '#FFA500' 
        }]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </View>

      <Text style={styles.studentName}>{item.studentName}</Text>
      
      <View style={styles.reasonContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.lilacBlue} style={styles.reasonIcon} />
        <Text style={styles.reason}>"{item.reason}"</Text>
      </View>

      <View style={styles.auditInfo}>
        <Text style={styles.auditText}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
        {item.type === 'promissory' && (
            <Text style={styles.auditText}>Parent Hub: {item.parentApproved ? 'Signed' : 'Pending'}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.lilacBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Letter Audit</Text>
        <Text style={styles.subtitle}>Universal visibility of all records</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <TouchableOpacity 
                key={f}
                style={[styles.filterBtn, filter === f && styles.activeFilter]}
                onPress={() => setFilter(f)}
            >
                <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
            </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredLetters}
        keyExtractor={(item) => item.id}
        renderItem={renderLetterItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={64} color={theme.lilacBlue} />
            <Text style={styles.emptyText}>No records found matching filter.</Text>
          </View>
        }
      />
    </View>
  );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
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
    color: theme.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.lilacBlue,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
    backgroundColor: theme.card,
  },
  activeFilter: {
    backgroundColor: theme.solidBlue,
    borderColor: theme.solidBlue,
  },
  filterText: {
    fontSize: 12,
    color: theme.lilacBlue,
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: theme.white,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: theme.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  date: {
    color: theme.lilacBlue,
    fontSize: 12,
  },
  studentName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  reasonContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  reasonIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  reason: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  auditInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    gap: 4,
  },
  auditText: {
    color: theme.lilacBlue,
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    color: theme.lilacBlue,
    textAlign: "center",
    marginTop: 12,
    fontSize: 16,
  },
    });
}

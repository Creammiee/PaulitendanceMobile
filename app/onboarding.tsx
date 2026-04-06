import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useRef } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ColorTheme } from "../constants/Colors";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const { width, height } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const slides: Slide[] = [
  {
    id: "1",
    title: "Real-time Tracking",
    description: "Monitor school bus locations and student arrivals in real-time.",
    icon: "map-outline",
    color: "#2C5EA8",
  },
  {
    id: "2",
    title: "Instant Attendance",
    description: "Teachers mark attendance effortlessly. Parents get notified immediately.",
    icon: "checkmark-circle-outline",
    color: "#488AC7",
  },
  {
    id: "3",
    title: "Digital Letters",
    description: "Submit excuse and promissory letters directly through the app.",
    icon: "mail-unread-outline",
    color: "#788FA6",
  },
];

export default function Onboarding() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync("has_seen_onboarding", "true");
    }
    router.replace("/sign-in");
  };

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon} size={120} color={item.color} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={flatListRef}
      />

      <View style={styles.footer}>
        <View style={styles.paginator}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: i === currentIndex ? 20 : 8, backgroundColor: i === currentIndex ? theme.solidBlue : theme.lilacBlue },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(theme: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    skipButton: {
      position: "absolute",
      top: 60,
      right: 30,
      zIndex: 10,
    },
    skipText: {
      color: theme.lilacBlue,
      fontSize: 16,
      fontWeight: "bold",
    },
    slide: {
      width,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    iconContainer: {
      width: 200,
      height: 200,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.text,
      textAlign: "center",
      marginBottom: 16,
    },
    description: {
      fontSize: 16,
      color: theme.lilacBlue,
      textAlign: "center",
      lineHeight: 24,
    },
    footer: {
      paddingBottom: 60,
      paddingHorizontal: 40,
    },
    paginator: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 30,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    nextButton: {
      backgroundColor: theme.solidBlue,
      height: 56,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    nextButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
    },
  });
}

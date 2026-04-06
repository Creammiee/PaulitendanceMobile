import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from '../hooks/useAppTheme';
import { ColorTheme } from '../constants/Colors';
import { useAuth } from "../ctx/AuthContext";

export default function SignIn() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setIsSigningIn(true);
    try {
      await signIn(email, password);
      // Router redirection is handled in _layout.tsx based on user state
    } catch (error: any) {
      let message = error.message || "An unknown error occurred.";
      if (error.code === "auth/configuration-not-found") {
        message =
          "Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.";
      } else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "Invalid email or password.";
      } else if (
        error.message.includes("User logged in but no profile found")
      ) {
        message =
          "Account exists but no profile found (checked students, teachers, parents, admins).";
      }
      Alert.alert("Login Failed", message);
      setIsSigningIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to Paulitendance
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.lilacBlue}
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.lilacBlue + "80"} // 50% opacity
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.lilacBlue}
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.lilacBlue + "80"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Social Login / Divider could go here */}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don\u2019t have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/sign-up")}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.nightTime,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    marginBottom: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.white,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.dive,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: theme.lilacBlue,
    marginBottom: 8,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.deepSea,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.sailingBlue,
    height: 56,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: theme.white,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: theme.dive,
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: theme.solidBlue,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.solidBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: theme.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    color: theme.lilacBlue,
    fontSize: 14,
  },
  footerLink: {
    color: theme.dive,
    fontSize: 14,
    fontWeight: "bold",
  },
    });
}

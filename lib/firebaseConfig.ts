// lib/firebaseConfig.ts
// Firebase configuration for Paulitendance mobile app

import { getAnalytics } from "firebase/analytics"; // optional for web analytics
import { initializeApp } from "firebase/app";

// Firebase project credentials from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app
export const firebaseApp = initializeApp(firebaseConfig);

import { getFirestore } from "firebase/firestore";
export const db = getFirestore(firebaseApp);

// Initialize Analytics (optional, works on web; safe to ignore on native)
export const analytics =
  typeof window !== "undefined" && typeof getAnalytics === "function"
    ? getAnalytics(firebaseApp)
    : null;

import { getAuth } from "firebase/auth";
export const auth = getAuth(firebaseApp);

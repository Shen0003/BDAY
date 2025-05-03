import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { FIREBASE_API_KEY } from "@env"; 

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "test-21874.firebaseapp.com",
  projectId: "test-21874",
  storageBucket: "test-21874.firebasestorage.app",
  messagingSenderId: "1052968199684",
  appId: "1:1052968199684:web:2e30de01539764e95a7751",
  measurementId: "G-SWN0H5988T"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);
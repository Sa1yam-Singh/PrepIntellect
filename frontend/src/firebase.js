import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Read Firebase credentials from Vite environment variables.
// Fallback to dummy credentials if variables are empty so the app remains fully functional.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key-prep-intellect-test",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "prep-intellect-test.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "prep-intellect-test",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "prep-intellect-test.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef12345"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

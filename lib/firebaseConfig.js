import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
  process.env.FIREBASE_DATABASE_URL ??
  "https://hostelvending-c1f3f-default-rtdb.asia-southeast1.firebasedatabase.app";

const firebaseConfig = {
  apiKey: "AIzaSyDTsbCcAvDj7YIWoKbu49geC0ORz5zX1_s",
  authDomain: "hostelvending-c1f3f.firebaseapp.com",
  projectId: "hostelvending-c1f3f",
  storageBucket: "hostelvending-c1f3f.firebasestorage.app",
  messagingSenderId: "542527350047",
  appId: "1:542527350047:web:6b3ffa354d3c1c28cb3c2a",
  databaseURL,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

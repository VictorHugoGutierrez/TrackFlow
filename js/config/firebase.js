import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEVuCltanRw8ax2IR3rW6qeO5a1bQpG3I",
  authDomain: "trackflow-web.firebaseapp.com",
  projectId: "trackflow-web",
  storageBucket: "trackflow-web.firebasestorage.app",
  messagingSenderId: "240003469191",
  appId: "1:240003469191:web:04c90413ace0a4c5b6cd22",
  measurementId: "G-WY9T0SX0YR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
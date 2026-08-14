import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4ABiWBvNQdKXFOO4PcUyjiFBvho55We4",
  authDomain: "bhanaram-1308b.firebaseapp.com",
  projectId: "bhanaram-1308b",
  storageBucket: "bhanaram-1308b.firebasestorage.app",
  messagingSenderId: "245762338349",
  appId: "1:245762338349:web:7baad83bb807f4008212a4",
  measurementId: "G-5WG8JCVM2Y"
};

export default firebaseConfig;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3f5vRWWpDT5MTjX1s8Uj26UW2m3m6mrQ",
  authDomain: "villagedeko-9df50.firebaseapp.com",
  projectId: "villagedeko-9df50",
  storageBucket: "villagedeko-9df50.firebasestorage.app",
  messagingSenderId: "809053890613",
  appId: "1:809053890613:web:88813ce03596357f65a97c",
  measurementId: "G-QZXPJ11BQM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// VillageDeko public client configuration.
// Firebase Web API keys are client-side identifiers; never place private secrets here.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA3f5vRWWpDT5MTjX1s8Uj26UW2m3m6mrQ",
  authDomain: "villagedeko-9df50.firebaseapp.com",
  projectId: "villagedeko-9df50",
  storageBucket: "villagedeko-9df50.firebasestorage.app",
  messagingSenderId: "809053890613",
  appId: "1:809053890613:web:88813ce03596357f65a97c",
  measurementId: "G-QZXPJ11BQM"
};

export const CLOUDINARY_CLOUD_NAME = "cyo6vdu5";
export const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// Cloudinary serves uploaded assets through its CDN automatically.
export const CLOUDINARY_CDN_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;

export const VILLAGEDEKO_MEDIA_ARCHITECTURE = {
  mediaStorage: "Cloudinary",
  dataStorage: "Firebase Firestore",
  mediaDelivery: "Cloudinary CDN",
  auth: "Firebase Authentication",
  googleSignIn: true
};

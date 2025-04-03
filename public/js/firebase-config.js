import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCRJ0YKArnUOxIChiOkOccA-AdlyHDahaE",
  authDomain: "surties-40ea2.firebaseapp.com",
  projectId: "surties-40ea2",
  storageBucket: "surties-40ea2.firebasestorage.app",
  messagingSenderId: "992136732465",
  appId: "1:992136732465:web:84747f6591734234f29a10",
  measurementId: "G-Y277V3EBYN"
};

// Initialize Firebase and export required objects
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export { auth, db, googleProvider, GoogleAuthProvider };

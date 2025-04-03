import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD3xIhY8hk4qWDFYQvUPFNppyI1odkJv98",
    authDomain: "surties-sweetshop.firebaseapp.com",
    projectId: "surties-sweetshop",
    storageBucket: "surties-sweetshop.firebasestorage.app",
    messagingSenderId: "614102868340",
    appId: "1:614102868340:web:9240510e74bb44f87f8c21",
    measurementId: "G-JV8JXS28M8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

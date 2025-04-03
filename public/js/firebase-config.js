import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// Add auth state observer
auth.onAuthStateChanged((user) => {
    if (!user && window.location.pathname !== '/auth.html') {
        // Check if trying to access checkout
        const params = new URLSearchParams(window.location.search);
        if (params.get('showCart') === 'true') {
            localStorage.setItem('pendingCheckout', 'true');
            window.location.href = '/auth.html?redirect=checkout';
        }
    }
});

export { auth, db };

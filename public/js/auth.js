import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail  // Add this import
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Add Toastify CSS to head
document.head.insertAdjacentHTML('beforeend', `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
`);

// Save user data to Firestore
async function saveUserData(user, additionalData = {}) {
    try {
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            displayName: user.displayName || additionalData.displayName,
            createdAt: new Date().toISOString(),
            ...additionalData
        });
    } catch (error) {
        console.error("Error saving user data:", error);
    }
}

// Toggle between login and signup forms with animation
window.toggleForms = () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const headerText = document.getElementById('authHeaderText');
    const headerTitle = document.querySelector('.auth-header h2');

    if (loginForm.style.display === 'none') {
        // Switching to login
        signupForm.classList.add('animate__fadeOutLeft');
        setTimeout(() => {
            signupForm.style.display = 'none';
            signupForm.classList.remove('animate__fadeOutLeft');
            loginForm.style.display = 'block';
            loginForm.classList.add('animate__fadeInRight');
            headerTitle.textContent = 'Welcome Back!';
            headerText.textContent = 'Please login to continue';
        }, 300);
    } else {
        // Switching to signup
        loginForm.classList.add('animate__fadeOutRight');
        setTimeout(() => {
            loginForm.style.display = 'none';
            loginForm.classList.remove('animate__fadeOutRight');
            signupForm.style.display = 'block';
            signupForm.classList.add('animate__fadeInLeft');
            headerTitle.textContent = 'Create Your Surties Account';
            headerText.textContent = 'Get started with a free account';
        }, 300);
    }
};

// Update the login handler
window.handleLogin = async (e) => {
    e.preventDefault();
    const button = e.target;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Signing in...';

    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || email.split('@')[0]
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        showSuccess('Welcome back! 🎉');
        
        // Check for redirect parameter
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        
        setTimeout(() => {
            if (redirect === 'checkout') {
                window.location.href = '/?showCart=true';
            } else {
                window.location.href = '/';
            }
        }, 1500);
    } catch (error) {
        showError(getErrorMessage(error));
        button.disabled = false;
        button.innerHTML = 'Sign In';
    }
};

// Modified signup handler
window.handleSignup = async (e) => {
    e.preventDefault();
    const button = e.target;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating account...';

    try {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const name = document.getElementById('signupName').value;

        // Validate password
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserData(userCredential.user, { displayName: name });

        showSuccess('Account created successfully! ✨ Please login to continue');
        
        // Automatically switch to login form after successful signup
        setTimeout(() => {
            toggleForms();
            // Pre-fill email in login form
            document.getElementById('loginEmail').value = email;
        }, 2000);
    } catch (error) {
        showError(getErrorMessage(error));
    } finally {
        button.disabled = false;
        button.innerHTML = 'Create Account';
    }
};

// Google Sign In
window.signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await saveUserData(result.user);
        showSuccess('Signed in with Google! 🎉');
        setTimeout(() => window.location.href = '/', 2000);
    } catch (error) {
        showError(getErrorMessage(error));
    }
};

// Apple Sign In
window.signInWithApple = async () => {
    try {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        
        const result = await signInWithPopup(auth, provider);
        await saveUserData(result.user);
        showSuccess('Signed in with Apple! 🎉');
        setTimeout(() => window.location.href = '/', 2000);
    } catch (error) {
        showError(getErrorMessage(error));
    }
};

// Add password reset handler
window.handlePasswordReset = async (e) => {
    e.preventDefault();
    const button = e.target;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

    try {
        const email = document.getElementById('resetEmail').value.trim();
        await sendPasswordResetEmail(auth, email);
        
        showSuccess('Password reset link sent! Please check your email');
        
        // Switch back to login form after 3 seconds
        setTimeout(() => {
            showLoginForm();
            document.getElementById('resetEmail').value = '';
        }, 3000);

    } catch (error) {
        showError(getErrorMessage(error));
    } finally {
        button.disabled = false;
        button.innerHTML = 'Send Reset Link';
    }
};

// Enhanced error messages
function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login instead.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/missing-email':
            return 'Please enter your email address';
        case 'auth/invalid-action-code':
            return 'Invalid or expired reset link. Please try again';
        default:
            return error.message;
    }
}

// Animated notifications
function showSuccess(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        },
        onClick: function(){} // Callback after click
    }).showToast();
}

function showError(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
        },
        onClick: function(){} // Callback after click
    }).showToast();
}

// Update sign out function
window.handleSignOut = async (e) => {
    e.preventDefault();
    const isSwitchAccount = e.target.classList.contains('login-another');
    
    try {
        await auth.signOut();
        localStorage.removeItem('user');
        
        // When switching accounts, keep cart but remove user data
        if (!isSwitchAccount) {
            localStorage.removeItem('cart');
        }
        
        // Show success message
        showSuccess(isSwitchAccount ? 'Switching accounts...' : 'Successfully signed out!');
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = isSwitchAccount 
                ? '/auth.html?switchAccount=true' 
                : '/auth.html?logout=true';
        }, 1500);
        
    } catch (error) {
        console.error('Sign out error:', error);
        showError('Error signing out. Please try again.');
    }
};

// Update the storage event listener
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        if (!e.newValue) {
            // User was logged out in another tab
            const loginButton = document.getElementById('loginButton');
            const userDropdown = document.getElementById('userDropdown');
            
            if (loginButton && userDropdown) {
                loginButton.classList.remove('d-none');
                userDropdown.classList.add('d-none');
                loginButton.innerHTML = `
                    <i class="bi bi-person-circle"></i>
                    <span>Login</span>
                `;
                loginButton.href = '/auth.html';
            }
        }
    }
});

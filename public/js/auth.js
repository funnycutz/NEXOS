// Auth Functions
let currentUser = null;

// Initialize auth listeners
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            handleUserSignIn(user);
        } else {
            // User is signed out
            handleUserSignOut();
        }
    });

    // Login form
    document.getElementById('login-btn').addEventListener('click', loginWithEmail);
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);
    
    // Register form
    document.getElementById('register-btn').addEventListener('click', registerWithEmail);
    document.getElementById('google-register-btn').addEventListener('click', registerWithGoogle);
    
    // Form toggles
    document.getElementById('show-register').addEventListener('click', showRegisterForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// Handle user sign in
async function handleUserSignIn(user) {
    try {
        // Check if user has a username
        const userRef = db.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // New user - need to create username
            if (user.providerData[0].providerId === 'google.com') {
                // Google user - suggest username from display name
                const suggestedUsername = user.displayName.replace(/\s+/g, '').toLowerCase();
                await createUsernameForUser(user.uid, user.email, suggestedUsername, user.photoURL);
            } else {
                // Email user - redirect to username creation
                showRegisterForm();
                alert('Please complete your registration by choosing a username.');
                await auth.signOut();
                return;
            }
        }
        
        // Update user last login
        await userRef.update({
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            isOnline: true
        });
        
        // Set current user
        currentUser = {
            uid: user.uid,
            email: user.email,
            username: snapshot.val().username,
            avatar: snapshot.val().avatar || user.photoURL || 'https://i.imgur.com/7bMqyJ2.png'
        };
        
        // Update UI
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        document.getElementById('username-display').textContent = currentUser.username;
        document.getElementById('user-avatar').src = currentUser.avatar;
        
        // Initialize chat
        initChat();
    } catch (error) {
        console.error('Error handling user sign in:', error);
        alert(error.message);
    }
}

// Handle user sign out
function handleUserSignOut() {
    if (currentUser) {
        // Update user status
        db.ref(`users/${currentUser.uid}`).update({
            isOnline: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        
        currentUser = null;
    }
    
    // Update UI
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    
    // Clear inputs
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-username').value = '';
}

// Login with email/password
async function loginWithEmail() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
}

// Register with email/password
async function registerWithEmail() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const username = document.getElementById('register-username').value.trim().toLowerCase();
    
    try {
        // Check if username exists
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error('Username already exists. Please choose another one.');
        }
        
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user profile
        await createUsernameForUser(userCredential.user.uid, email, username);
        
        // Sign in the user
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
}

// Login with Google
async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        alert(error.message);
    }
}

// Register with Google
async function registerWithGoogle() {
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user already exists
        const userRef = db.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // New user - create username from display name
            const username = user.displayName.replace(/\s+/g, '').toLowerCase();
            await createUsernameForUser(user.uid, user.email, username, user.photoURL);
        }
    } catch (error) {
        alert(error.message);
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        alert(error.message);
    }
}

// Check if username exists
async function checkUsernameExists(username) {
    const snapshot = await db.ref('usernames').once('value');
    return snapshot.hasChild(username);
}

// Create username for user
async function createUsernameForUser(uid, email, username, avatar = null) {
    // Check username again (in case of race condition)
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
        throw new Error('Username already exists. Please choose another one.');
    }
    
    // Create user profile
    await db.ref(`users/${uid}`).set({
        username: username,
        email: email,
        avatar: avatar,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        isOnline: true
    });
    
    // Reserve username
    await db.ref(`usernames/${username}`).set(uid);
}

// Show register form
function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

// Show login form
function showLoginForm() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);

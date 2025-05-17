const firebaseConfig = {
  apiKey: "AIzaSyA1_5JPp-WrTduZP--qjT19699HPdL9DNs",
  authDomain: "nexos-c4746.firebaseapp.com",
  databaseURL: "https://nexos-c4746-default-rtdb.firebaseio.com",
  projectId: "nexos-c4746",
  storageBucket: "nexos-c4746.firebasestorage.app",
  messagingSenderId: "967709751357",
  appId: "1:967709751357:web:1b786433d1baeb3ee35254"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

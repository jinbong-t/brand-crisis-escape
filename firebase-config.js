import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, runTransaction, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBts9CtUvSM0-DG5h5oWa7K32m2LpXytHY",
  authDomain: "brand-crisis-escape.firebaseapp.com",
  projectId: "brand-crisis-escape",
  storageBucket: "brand-crisis-escape.firebasestorage.app",
  messagingSenderId: "1048103557577",
  appId: "1:1048103557577:web:47f72520057057e0e13018",
  measurementId: "G-JBZKBCTCXN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, runTransaction, getDocs, deleteDoc };

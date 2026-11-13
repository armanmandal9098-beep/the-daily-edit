
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGGyCSDESLU2P5LWbyvfgFVm6ggisT6CI",
  authDomain: "the-daily-edit-95f01.firebaseapp.com",
  projectId: "the-daily-edit-95f01",
  storageBucket: "the-daily-edit-95f01.firebasestorage.app",
  messagingSenderId: "535867728827",
  appId: "1:535867728827:web:eb63d9fb65c6af9b339a9e",
  measurementId: "G-EXT67S3MKR"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export {
  db,
  auth,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};


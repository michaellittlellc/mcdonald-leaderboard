import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3hIyf__Kg0UBqs387hrJlFrV7lUklUDI",
  authDomain: "mcdonaldgroupleaderboard.firebaseapp.com",
  projectId: "mcdonaldgroupleaderboard",
  storageBucket: "mcdonaldgroupleaderboard.firebasestorage.app",
  messagingSenderId: "40220690872",
  appId: "1:40220690872:web:2f7f5d06c059555548674d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

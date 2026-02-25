import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu configuración de Firebase (esta parte estaba perfecta)
const firebaseConfig = {
  apiKey: "AIzaSyDSNgg0sc91irKRdCrDry9KRTw_1024TKU",
  authDomain: "pixelcraft-manager.firebaseapp.com",
  projectId: "pixelcraft-manager",
  storageBucket: "pixelcraft-manager.firebasestorage.app",
  messagingSenderId: "508320372588",
  appId: "1:508320372588:web:a1a5c27512c16cb85f0549"
};

// Inicializamos la app (UNA SOLA VEZ)
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos
export const db = getFirestore(app);
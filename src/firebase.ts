import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

if (!firebaseConfig || !firebaseConfig.projectId) {
  throw new Error("Firebase configuration is missing or invalid. Please check firebase-applet-config.json.");
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to bypass WebSocket restrictions
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);

// Connection test
async function testConnection() {
  try {
    console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId || "(default)");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    console.error("Firestore connection test failed:", error.message);
    if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
      console.warn("Firestore is currently unreachable. The app will continue in offline mode.");
    }
  }
}

testConnection();

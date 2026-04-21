import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  AuthError
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const authError = error as AuthError;
    // Handle specific cancellation/close errors gracefully
    if (
      authError.code === 'auth/cancelled-popup-request' || 
      authError.code === 'auth/popup-closed-by-user'
    ) {
      console.warn("User cancelled the sign-in popup.");
      return null; // Return null to indicate user-initiated cancellation
    }
    
    console.error("Error signing in with Google", error);
    throw error;
  }
}

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

// Connection test as required by guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

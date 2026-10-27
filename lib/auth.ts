import { GoogleAuthProvider, signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { seedDemoAccount } from "./demo";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      apiKey: null,
      activeResumeId: null,
      goals: null,
      createdAt: serverTimestamp(),
    });
  }

  return user;
}

// A throwaway anonymous account with sample data, so visitors can look around without signing up.
// Needs the Anonymous provider switched on in Firebase Authentication.
export async function signInAsDemo() {
  const { user } = await signInAnonymously(auth);
  await seedDemoAccount(user.uid);
  return user;
}

export const signOutUser = () => signOut(auth);
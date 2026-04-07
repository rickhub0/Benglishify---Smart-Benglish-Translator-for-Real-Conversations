import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { OperationType, handleFirestoreError } from "./translationService";

export interface CorrectionData {
  originalInput: string;
  suggestedOutput: string;
  aiOutput: string;
  direction: string;
  userEmail?: string | null;
}

/**
 * Submits a user-suggested correction to Firestore.
 */
export async function submitCorrection(data: CorrectionData) {
  const path = "corrections";
  try {
    const correctionsRef = collection(db, path);
    await addDoc(correctionsRef, {
      ...data,
      timestamp: serverTimestamp(),
      status: "pending",
      userEmail: auth.currentUser?.email || data.userEmail || "anonymous"
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

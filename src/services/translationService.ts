import { db, auth } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, increment, updateDoc, doc, DocumentData, limit } from "firebase/firestore";
import { translateWithAI, TranslationDirection, ConversationContext } from "./geminiService";

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  source: 'rule-based' | 'ai';
  fullResult?: {
    benglish: string;
    english: string;
    bengali: string;
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncMasterDictionary() {
  try {
    const translationsRef = collection(db, "translations");
    const q = query(translationsRef, limit(500)); // Sync 
    await getDocs(q);
  } catch (error) {
    console.warn("Failed to sync master dictionary:", error);
  }
}

const translationCache = new Map<string, TranslationResult>();
const MAX_CACHE_SIZE = 100;

export async function translate(text: string, direction: TranslationDirection, history: ConversationContext[] = []): Promise<TranslationResult> {
  const cacheKey = `${direction}:${text.trim().toLowerCase()}`;
  
  // Check in-memory cache first for near-instant results
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Rule-based lookup (Online)
  const path = "translations";
  try {
    const translationsRef = collection(db, path);
    let q;
    
    if (direction === 'benglish-to-english') {
      q = query(translationsRef, where("benglish", "==", text.toLowerCase()));
    } else if (direction === 'bengali-to-english') {
      q = query(translationsRef, where("bengali", "==", text));
    } else if (direction === 'english-to-bengali') {
      q = query(translationsRef, where("english", "==", text));
    } else if (direction === 'english-to-benglish') {
      q = query(translationsRef, where("english", "==", text));
    }

    if (q) {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data() as DocumentData;
        let translatedText = "";
        if (direction === 'benglish-to-english' || direction === 'bengali-to-english') {
          translatedText = docData.english;
        } else if (direction === 'english-to-bengali') {
          translatedText = docData.bengali;
        } else if (direction === 'english-to-benglish') {
          translatedText = docData.benglish;
        }

        if (translatedText) {
          const result: TranslationResult = {
            translatedText,
            confidence: docData.confidence || 1.0,
            source: 'rule-based'
          };
          
          // Cache successful result
          if (translationCache.size >= MAX_CACHE_SIZE) {
            const firstKey = translationCache.keys().next().value;
            if (firstKey) translationCache.delete(firstKey);
          }
          translationCache.set(cacheKey, result);

          return result;
        }
      }
    }
  } catch (error) {
    console.warn("Rule-based lookup failed, falling back to AI:", error);
  }

  // 2. AI Translation (Online)
  try {
    const aiTranslation = await translateWithAI(text, direction, history);
    
    let result: TranslationResult;
    if (typeof aiTranslation === 'object') {
      result = {
        translatedText: aiTranslation.english, // Default to English for generic use
        confidence: 0.9,
        source: 'ai',
        fullResult: aiTranslation
      };
    } else {
      result = {
        translatedText: aiTranslation,
        confidence: 0.8,
        source: 'ai'
      };
    }

    // Save successful AI translations to unknown inputs log
    if (result.translatedText && result.translatedText !== "Error in translation.") {
      logUnknownInput(text, direction);
      
      // Cache successful result
      if (translationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
      translationCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error("AI Translation failed:", error);
    throw error;
  }
}

async function logUnknownInput(input: string, direction: string) {
  const path = "unknown_inputs";
  try {
    const unknownRef = collection(db, path);
    const q = query(unknownRef, where("input", "==", input), where("direction", "==", direction));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(unknownRef, {
        input,
        direction,
        timestamp: serverTimestamp(),
        count: 1
      });
    } else {
      const docId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, path, docId), {
        count: increment(1),
        timestamp: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

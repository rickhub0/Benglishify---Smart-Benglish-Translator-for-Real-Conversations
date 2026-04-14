import { db, auth } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, increment, updateDoc, doc, DocumentData, limit } from "firebase/firestore";
import { translateWithAI, TranslationDirection, ConversationContext } from "./geminiService";
import { offlineService } from "./offlineService";

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  source: 'rule-based' | 'ai' | 'offline-cache' | 'offline-dictionary' | 'community-driven';
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
  if (!offlineService.isOnline()) return;
  
  try {
    const translationsRef = collection(db, "translations");
    const q = query(translationsRef, limit(500)); // Sync top 500 common translations
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => doc.data());
    offlineService.saveMasterDictionary(data);
    console.log("Master dictionary synced offline.");
  } catch (error) {
    console.warn("Failed to sync master dictionary:", error);
  }
}

export async function translate(text: string, direction: TranslationDirection, history: ConversationContext[] = []): Promise<TranslationResult> {
  const isOnline = offlineService.isOnline();

  // 1. Check Offline Cache/Dictionary first if offline
  if (!isOnline) {
    const cached = offlineService.getFromCache(text, direction);
    if (cached) {
      return {
        translatedText: cached.translatedText,
        confidence: cached.confidence,
        source: 'offline-cache',
        fullResult: cached.fullResult
      };
    }

    const dictMatch = offlineService.lookupInDictionary(text, direction);
    if (dictMatch) {
      return {
        translatedText: dictMatch,
        confidence: 0.95,
        source: 'offline-dictionary'
      };
    }

    throw new Error("You are currently offline. This translation is not available in your local cache.");
  }

    // 2. Rule-based lookup (Online)
    const collections = ["translations", "community_translations"];
    
    for (const path of collections) {
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
                source: path === 'translations' ? 'rule-based' : 'community-driven'
              };
              offlineService.saveToCache(text, direction, result);
              return result;
            }
          }
        }
      } catch (error) {
        console.warn(`${path} lookup failed:`, error);
      }
    }

  // 3. AI Translation (Online)
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

    // Cache successful AI translations and save to Community Dictionary
    if (result.translatedText && result.translatedText !== "Error in translation.") {
      offlineService.saveToCache(text, direction, result);
      saveToCommunityDictionary(text, direction, result);
      logUnknownInput(text, direction);
    }

    return result;
  } catch (error) {
    console.error("AI Translation failed:", error);
    throw error;
  }
}

async function saveToCommunityDictionary(input: string, direction: TranslationDirection, result: TranslationResult) {
  if (!result.fullResult) return;
  
  const path = "community_translations";
  try {
    const communityRef = collection(db, path);
    // Check if it already exists to avoid duplicates
    const q = query(communityRef, where("english", "==", result.fullResult.english), limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(communityRef, {
        ...result.fullResult,
        confidence: 0.85,
        addedAt: serverTimestamp(),
        verified: false,
        usageCount: 1
      });
    }
  } catch (error) {
    console.warn("Failed to save to community dictionary:", error);
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

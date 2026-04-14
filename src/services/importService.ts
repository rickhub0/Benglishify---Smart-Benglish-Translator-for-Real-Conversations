import { db } from "../firebase";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { OperationType, handleFirestoreError } from "./translationService";

export interface RawTranslation {
  benglish: string;
  bengali: string;
  english: string;
  type?: string;
  tense?: string;
  synonyms?: string[];
  example?: string;
  notes?: string;
  confidence?: number;
}

import { generateSyntheticBenglishData } from "./geminiService";

export async function bootstrapCommunityDictionary(count: number = 20) {
  try {
    const data = await generateSyntheticBenglishData(count);
    const batch = writeBatch(db);
    const path = "community_translations";
    
    data.forEach(item => {
      const docRef = doc(collection(db, path));
      batch.set(docRef, {
        ...item,
        confidence: 0.9,
        addedAt: serverTimestamp(),
        verified: true,
        usageCount: 1,
        source: 'ai-bootstrap'
      });
    });

    await batch.commit();
    return data.length;
  } catch (error) {
    console.error("Bootstrap failed:", error);
    throw error;
  }
}

export async function importCSVData(csvText: string, format: 'benglish-first' | 'english-first') {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  // Skip header if it exists
  const startIdx = lines[0].toLowerCase().includes('id') ? 1 : 0;
  
  const translations: RawTranslation[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 4) continue;

    let item: RawTranslation;
    if (format === 'benglish-first') {
      // ID,Benglish,Bengali,English,Type,Tense,Synonyms,Sentence Example,Notes,Confidence
      item = {
        benglish: cols[1].toLowerCase(),
        bengali: cols[2],
        english: cols[3],
        type: cols[4],
        tense: cols[5],
        synonyms: cols[6] ? cols[6].split('|') : [],
        example: cols[7],
        notes: cols[8],
        confidence: parseFloat(cols[9]) || 1.0
      };
    } else {
      // ID,English,Benglish,Bengali,Type,Tense,Synonyms,Sentence Example,Notes,Confidence
      item = {
        english: cols[1],
        benglish: cols[2].toLowerCase(),
        bengali: cols[3],
        type: cols[4],
        tense: cols[5],
        synonyms: cols[6] ? cols[6].split('|') : [],
        example: cols[7],
        notes: cols[8],
        confidence: parseFloat(cols[9]) || 1.0
      };
    }
    translations.push(item);
  }

  // Batch upload (Firestore limit is 500 per batch)
  const batchSize = 400;
  let count = 0;
  const path = "translations";

  try {
    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = translations.slice(i, i + batchSize);
      
      chunk.forEach(item => {
        const docRef = doc(collection(db, path));
        batch.set(docRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      count += chunk.length;
      console.log(`Imported ${count} items...`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return count;
}

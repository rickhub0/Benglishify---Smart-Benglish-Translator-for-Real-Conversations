/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Languages, ArrowRightLeft, Copy, Check, Sparkles, History, Info, Loader2, Settings, Upload, X, AlertCircle, LogIn, LogOut, User, ChevronDown, Mic, MicOff, Volume2, Wifi, WifiOff, CheckCircle, XCircle, Wand2, Github, Instagram } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translate, TranslationResult, syncMasterDictionary } from "./services/translationService";
import { importCSVData } from "./services/importService";
import { submitCorrection } from "./services/correctionService";
import { speechService } from "./services/speechService";
import { transliterationService } from "./services/transliterationService";
import { checkGrammar, GrammarCheckResult } from "./services/grammarlyService";
import { TranslationDirection, ConversationContext } from "./services/geminiService";
import { offlineService } from "./services/offlineService";
import { cn } from "./lib/utils";
import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AboutPage from "./pages/About";

function TranslatorContent() {
  const [inputText, setInputText] = useState("");
  const [direction, setDirection] = useState<TranslationDirection>('benglish-to-english');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<ConversationContext[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Admin / Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [importFormat, setImportFormat] = useState<'benglish-first' | 'english-first'>('benglish-first');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Correction State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(true); // Default to voice mode for better UX
  const [isOnline, setIsOnline] = useState(offlineService.isOnline());
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // Live Voice State
  const [liveBenglish, setLiveBenglish] = useState("");
  const [liveBengali, setLiveBengali] = useState("");
  
  // Grammarly State
  const [grammarResult, setGrammarResult] = useState<GrammarCheckResult | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);

  // Debounced translation effect
  useEffect(() => {
    if (isVoiceMode) return; // Only for text mode
    
    if (!inputText.trim()) {
      setResult(null);
      setTranslationError(null);
      return;
    }

    // Faster debounce for "live" feel
    const timer = setTimeout(() => {
      handleTranslate();
    }, 500); 

    return () => clearTimeout(timer);
  }, [inputText, direction, isVoiceMode]);

  // Live translation for immediate feedback
  const handleLiveTranslate = (text: string) => {
    if (!text.trim() || isVoiceMode) return;
    
    // 1. Check Offline Cache/Dictionary first for immediate result
    const cached = offlineService.getFromCache(text, direction);
    if (cached) {
      setResult({
        ...cached,
        source: 'offline-cache'
      });
      return;
    }

    const dictMatch = offlineService.lookupInDictionary(text, direction);
    if (dictMatch) {
      setResult({
        translatedText: dictMatch,
        confidence: 0.95,
        source: 'offline-dictionary'
      });
      return;
    }

    // 2. If no full match, try word-by-word for very fast feedback (only for Benglish to English)
    if (direction === 'benglish-to-english') {
      const words = text.toLowerCase().trim().split(/\s+/);
      if (words.length > 1) {
        const translatedWords = words.map(word => {
          const match = offlineService.lookupInDictionary(word, direction);
          return match || word;
        });
        
        // Only show if at least one word was translated
        if (translatedWords.some((w, i) => w !== words[i])) {
          setResult({
            translatedText: translatedWords.join(' '),
            confidence: 0.5,
            source: 'offline-dictionary'
          });
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        syncMasterDictionary();
      }
    });

    // Offline handling
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Ignore if user closed the popup
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleTranslate = async (overrideDirection?: TranslationDirection) => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setTranslationError(null);
    try {
      const translationDirection = overrideDirection || direction;
      const translation = await translate(inputText, translationDirection, history);
      setResult(translation);
      
      // Update history for context
      setHistory(prev => {
        const newEntry = { input: inputText, output: translation.translatedText };
        const updated = [...prev, newEntry];
        return updated.slice(-5); // Keep last 5 for context
      });
    } catch (error: any) {
      console.error("Translation error:", error);
      setTranslationError(error.message || "An unexpected error occurred during translation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvInput.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const count = await importCSVData(csvInput, importFormat);
      setImportStatus({ success: true, message: `Successfully imported ${count} translations!` });
      setCsvInput("");
    } catch (error: any) {
      console.error("Import error:", error);
      let message = "Import failed. Check console for details.";
      if (error.message?.includes("insufficient permissions")) {
        message = "Permission Denied: You must be logged in as an admin (royrk3369@gmail.com) to import data.";
      }
      setImportStatus({ success: false, message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!suggestedText.trim() || !result) return;
    setIsSubmittingCorrection(true);
    setCorrectionStatus(null);
    try {
      await submitCorrection({
        originalInput: inputText,
        suggestedOutput: suggestedText,
        aiOutput: result.translatedText,
        direction: direction,
        userEmail: user?.email
      });
      setCorrectionStatus({ success: true, message: "Thank you! Your correction has been submitted for review." });
      setSuggestedText("");
      setTimeout(() => setShowCorrectionModal(false), 3000);
    } catch (error) {
      console.error("Correction submission error:", error);
      setCorrectionStatus({ success: false, message: "Failed to submit correction. Please try again." });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const toggleDirection = () => {
    const map: Record<TranslationDirection, TranslationDirection> = {
      'benglish-to-english': 'english-to-benglish',
      'english-to-benglish': 'benglish-to-english',
      'bengali-to-english': 'english-to-bengali',
      'english-to-bengali': 'bengali-to-english',
      'voice-input': 'voice-input' // Voice input stays voice input
    };
    
    const newDirection = map[direction];
    const currentInput = inputText;
    const currentOutput = result?.translatedText || "";

    setDirection(newDirection);
    setInputText(currentOutput);
    
    if (currentInput) {
      setResult({
        translatedText: currentInput,
        confidence: result?.confidence || 1.0,
        source: result?.source || 'ai'
      });
    } else {
      setResult(null);
    }
  };

  const copyToClipboard = () => {
    if (result?.translatedText) {
      navigator.clipboard.writeText(result.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAdmin = user?.email === "royrk3369@gmail.com";

  const handleVoiceInput = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    setIsListening(true);
    setLiveBenglish("");
    setLiveBengali("");
    
    // Voice mode always uses Bengali as input
    const langCode = 'bn-BD';

    speechService.startListening(
      langCode,
      (transcript, isFinal) => {
        setInputText(transcript);
        setLiveBengali(transcript);
        setLiveBenglish(transliterationService.transliterate(transcript));
        
        if (isFinal) {
          setIsListening(false);
          // Auto-translate using the special 'voice-input' direction
          handleTranslate('voice-input' as TranslationDirection);
        }
      },
      (error) => {
        console.error("Speech error:", error);
        setSpeechError(`Speech error: ${error}`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleSpeak = () => {
    const textToSpeak = result?.fullResult?.english || result?.translatedText;
    if (!textToSpeak) return;
    
    // Determine language code - if it's voice mode, we usually speak the English part
    // unless the target is specifically Benglish/Bengali
    const targetLang = direction.split('-to-')[1];
    const langCode = targetLang === 'english' ? 'en-US' : 'bn-BD';
    
    speechService.speak(textToSpeak, langCode);
  };

  const handleGrammarCheck = async (text?: string, lang?: 'benglish' | 'english') => {
    const textToCheck = text || inputText;
    if (!textToCheck.trim()) return;
    
    setIsCheckingGrammar(true);
    setGrammarResult(null);
    try {
      const sourceLang = lang || (direction.split('-to-')[0] as 'benglish' | 'english' | 'bengali');
      // If source is Bengali, we don't have a specific grammar check for it yet, 
      // but we can treat it as Benglish for phonetic check or just skip.
      // For now, let's only check if it's English or Benglish.
      if (sourceLang === 'bengali') {
        setIsCheckingGrammar(false);
        return;
      }
      
      const res = await checkGrammar(textToCheck, sourceLang as 'benglish' | 'english');
      setGrammarResult(res);
      setShowGrammarModal(true);
    } catch (error) {
      console.error("Grammar check error:", error);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const applyGrammarCorrection = () => {
    if (grammarResult) {
      // If the original text matches the input text, update input text
      if (grammarResult.originalText === inputText) {
        setInputText(grammarResult.correctedText);
      } else if (result && grammarResult.originalText === result.translatedText) {
        // If it was the translation result, we could update the result, 
        // but it's better to just show it.
        // For now, let's just update the input text if it matches.
      }
      setShowGrammarModal(false);
      setGrammarResult(null);
    }
  };

  const getSourceLang = () => {
    if (direction.startsWith('benglish')) return 'Benglish';
    if (direction.startsWith('bengali')) return 'Bengali';
    return 'English';
  };

  const getTargetLang = () => {
    if (direction.endsWith('benglish')) return 'Benglish';
    if (direction.endsWith('bengali')) return 'Bengali';
    return 'English';
  };

  const getSpeechErrorMessage = (error: string) => {
    const err = error.toLowerCase();
    if (err.includes('no-speech')) return "No speech was detected. Please try again.";
    if (err.includes('audio-capture')) return "Audio capture failed. Please check your microphone.";
    if (err.includes('not-allowed') || err.includes('permission')) return "Microphone access denied. Please enable it in your browser settings.";
    if (err.includes('network')) return "Network error during speech recognition.";
    if (err.includes('aborted')) return "Speech recognition was aborted.";
    if (err.includes('not supported')) return "Speech recognition is not supported in this browser. Try Chrome.";
    return error;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] font-sans selection:bg-blue-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center">
            <span className="text-gray-900">বেং</span>
            <span className="text-[#C25400]">lish</span>
            <span className="text-gray-900">ify</span>
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-[10px] md:text-xs font-bold uppercase tracking-wider animate-pulse">
              <WifiOff className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Offline
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowImportModal(true)}
              className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
              title="Import Data"
            >
              <Upload className="w-5 h-5" />
            </button>
          )}
          
          <div className="hidden md:block h-6 w-[1px] bg-gray-200 mx-1" />

          {isAuthLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : user ? (
            <div className="flex items-center gap-1 md:gap-2">
              <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
              <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full border border-gray-200 text-xs md:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}

          <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 flex-1 w-full flex flex-col gap-6">
        {/* Mode Toggle */}
        <div className="flex flex-col gap-4">
          {translationError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Translation Error</p>
                <p className="text-xs opacity-80">{translationError}</p>
              </div>
              <button onClick={() => setTranslationError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {speechError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
            >
              <MicOff className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Voice Input Error</p>
                <p className="text-xs opacity-80">{getSpeechErrorMessage(speechError)}</p>
              </div>
              <button onClick={() => setSpeechError(null)} className="p-1 hover:bg-amber-100 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              <button 
                onClick={() => setIsVoiceMode(true)}
                className={cn(
                  "px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2",
                  isVoiceMode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Voice
              </button>
              <button 
                onClick={() => setIsVoiceMode(false)}
                className={cn(
                  "px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2",
                  !isVoiceMode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Languages className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Text
              </button>
            </div>
          </div>
        </div>

        {isVoiceMode ? (
          <div className="flex-1 flex flex-col gap-6 w-full max-w-5xl mx-auto">
            {/* Main Voice Interface - Split Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 min-h-[400px]">
              
              {/* Left Side: Input (Benglish + Bengali) */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 flex-1 flex flex-col gap-6 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        isListening ? "bg-red-500 animate-pulse" : "bg-gray-300"
                      )} />
                      <span className="text-[11px] font-black tracking-[0.2em] text-gray-400 uppercase">Bengali Input</span>
                    </div>
                    {isListening && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                        Live
                      </motion.div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-8 justify-center">
                    {/* Primary: Benglish */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Benglish</span>
                      <div className={cn(
                        "text-3xl md:text-5xl font-black leading-[1.1] tracking-tight transition-all",
                        isListening ? "text-blue-600" : "text-gray-900",
                        !liveBenglish && !isListening && "text-gray-200"
                      )}>
                        {liveBenglish || (isListening ? "..." : "Speak now")}
                      </div>
                    </div>

                    {/* Secondary: Bengali Script */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bengali Script</span>
                      <div className={cn(
                        "text-xl md:text-2xl font-medium leading-relaxed transition-all",
                        isListening ? "text-gray-500" : "text-gray-400",
                        !liveBengali && !isListening && "text-gray-100"
                      )}>
                        {liveBengali || (isListening ? "..." : "আপনার কথা বলুন")}
                      </div>
                    </div>
                  </div>

                  {isListening && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500/10 w-full overflow-hidden">
                      <motion.div 
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="h-full w-1/3 bg-blue-500 rounded-full"
                      />
                    </div>
                  )}
                </div>

                {/* Mic Button - Large Touch Target */}
                <button 
                  onClick={handleVoiceInput}
                  className={cn(
                    "w-full py-6 rounded-3xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-lg",
                    isListening 
                      ? "bg-red-500 text-white shadow-red-200" 
                      : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-6 h-6" />
                      <span className="font-bold uppercase tracking-widest text-sm">Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6" />
                      <span className="font-bold uppercase tracking-widest text-sm">Start Speaking</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Side: Output (English) */}
              <div className="flex flex-col">
                <div className={cn(
                  "bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 flex-1 flex flex-col gap-6 relative transition-all",
                  isLoading && "opacity-60 grayscale-[0.5]"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-black tracking-[0.2em] text-gray-400 uppercase">English Translation</span>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {result ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex flex-col gap-6"
                        >
                          <div className="text-2xl md:text-4xl font-bold text-gray-800 leading-tight">
                            {result.fullResult?.english || result.translatedText}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                              {result.source.replace('-', ' ')}
                            </span>
                            <div className="flex gap-2">
                              <button onClick={handleSpeak} className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-all">
                                <Volume2 className="w-5 h-5" />
                              </button>
                              <button onClick={copyToClipboard} className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-all">
                                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="text-gray-200 text-2xl md:text-4xl font-bold italic">
                          {isLoading ? "Translating..." : "Translation will appear here"}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Reset Button */}
                <button 
                  onClick={() => {
                    setInputText("");
                    setResult(null);
                    setLiveBenglish("");
                    setLiveBengali("");
                  }}
                  className="mt-4 flex items-center justify-center gap-2 py-4 rounded-3xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <X className="w-4 h-4" />
                  Reset Session
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Existing Text Translation UI */
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 md:mb-8">
          <div className="flex items-center border-b border-gray-100 bg-gray-50/50">
            {/* Source Language Selector */}
            <div className="flex-1 relative group">
              <select 
                value={direction.split('-to-')[0]}
                onChange={(e) => {
                  const newSource = e.target.value;
                  const currentTarget = direction.split('-to-')[1];
                  
                  if (newSource === 'english') {
                    // If switching to English source, default to Benglish if it was English
                    setDirection(currentTarget === 'english' ? 'english-to-benglish' : `english-to-${currentTarget}` as TranslationDirection);
                  } else {
                    // If switching to Benglish/Bengali source, target MUST be English
                    setDirection(`${newSource}-to-english` as TranslationDirection);
                  }
                }}
                className="w-full py-3 md:py-4 px-4 md:px-6 bg-transparent border-none focus:ring-0 font-medium text-blue-600 cursor-pointer appearance-none text-sm md:text-base"
              >
                <option value="benglish">Benglish</option>
                <option value="bengali">Bengali</option>
                <option value="english">English</option>
              </select>
              <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400 pointer-events-none" />
            </div>

            <button 
              onClick={toggleDirection}
              className="p-2 md:p-3 mx-1 md:mx-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-all active:scale-90"
              title="Swap Languages"
            >
              <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Target Language Selector */}
            <div className="flex-1 relative group">
              <select 
                value={direction.split('-to-')[1]}
                onChange={(e) => {
                  const newTarget = e.target.value;
                  const currentSource = direction.split('-to-')[0];

                  if (newTarget === 'english') {
                    // If switching to English target, source can be Benglish or Bengali
                    setDirection(currentSource === 'english' ? 'benglish-to-english' : `${currentSource}-to-english` as TranslationDirection);
                  } else {
                    // If switching to Benglish/Bengali target, source MUST be English
                    setDirection(`english-to-${newTarget}` as TranslationDirection);
                  }
                }}
                className="w-full py-3 md:py-4 px-4 md:px-6 bg-transparent border-none focus:ring-0 font-medium text-gray-600 cursor-pointer appearance-none text-sm md:text-base"
              >
                <option value="english">English</option>
                <option value="benglish">Benglish</option>
                <option value="bengali">Bengali</option>
              </select>
              <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[250px] md:min-h-[300px]">
            {/* Input Area */}
            <div className={cn(
              "p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 relative group transition-all",
              isListening && "bg-red-50/30"
            )}>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-3 md:top-4 left-4 md:left-6 flex items-center gap-2 bg-red-100 text-red-600 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-red-200 text-[9px] md:text-[10px] font-bold tracking-widest uppercase z-10"
                >
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                  Listening...
                </motion.div>
              )}
              <textarea
                value={inputText}
                onChange={(e) => {
                  const text = e.target.value;
                  setInputText(text);
                  handleLiveTranslate(text);
                }}
                placeholder={isListening ? "Speak now..." : `Enter ${getSourceLang()}...`}
                className={cn(
                  "w-full h-full min-h-[150px] md:min-h-[200px] resize-none border-none focus:ring-0 text-lg md:text-xl placeholder:text-gray-300 bg-transparent transition-all",
                  isListening && "placeholder:text-red-300"
                )}
              />
              {inputText && !isListening && (
                <button
                  onClick={() => {
                    setInputText("");
                    setResult(null);
                  }}
                  className="absolute top-4 md:top-6 right-4 md:right-6 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-all"
                  title="Clear text"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex items-center gap-2 md:gap-3">
                <span className="text-[10px] md:text-xs text-gray-400">{inputText.length} / 5000</span>
                <button
                  onClick={handleVoiceInput}
                  className={cn(
                    "p-1.5 md:p-2 rounded-full transition-all",
                    isListening ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
                <button
                  onClick={() => handleGrammarCheck()}
                  disabled={isCheckingGrammar || !inputText.trim() || direction.startsWith('bengali')}
                  className={cn(
                    "p-1.5 md:p-2 rounded-lg transition-colors",
                    inputText.trim() && !direction.startsWith('bengali')
                      ? "text-blue-500 hover:bg-blue-50" 
                      : "text-gray-300 cursor-not-allowed"
                  )}
                  title="Check Grammar"
                >
                  {isCheckingGrammar ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Output Area */}
            <div className={cn(
              "p-4 md:p-6 bg-gray-50/30 relative flex flex-col",
              isLoading && "opacity-60"
            )}>
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1"
                  >
                    <p className="text-lg md:text-xl leading-relaxed text-gray-800">
                      {result.translatedText}
                    </p>
                    <div className="mt-3 md:mt-4 flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded",
                        result.source === 'rule-based' ? "bg-green-100 text-green-700" : 
                        result.source.startsWith('offline') ? "bg-amber-100 text-amber-700" :
                        "bg-purple-100 text-purple-700"
                      )}>
                        {result.source.replace('-', ' ')}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-400">
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => {
                          setSuggestedText("");
                          setCorrectionStatus(null);
                          setShowCorrectionModal(true);
                        }}
                        className="ml-auto md:ml-2 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-wider border border-orange-100/50"
                        title="Suggest a better translation"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Suggest Correction
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div key="placeholder" className="flex-1 flex items-center justify-center text-gray-300 italic text-sm md:text-base">
                    {isLoading ? "Translating..." : "Translation will appear here"}
                  </div>
                )}
              </AnimatePresence>

              {result && (
                <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex items-center gap-1.5 md:gap-2">
                  <button
                    onClick={() => handleGrammarCheck(result.translatedText, direction.split('-to-')[1] as 'benglish' | 'english')}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                    title="Check translation grammar"
                  >
                    <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={handleSpeak}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                    title="Listen to translation"
                  >
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors relative"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Context Display */}
        {history.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl mb-8">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                Recent Context
              </h4>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setHistory([])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  title="Clear context for next translation"
                >
                  Clear Context
                </button>
                <button 
                  onClick={() => {
                    if (confirm("This will clear your recent context and persistent translation history. Are you sure?")) {
                      setHistory([]);
                      offlineService.clearCache();
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                  title="Clear context and offline cache"
                >
                  Clear All History
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item, idx) => (
                <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 max-w-[200px] truncate">
                  <span className="font-semibold text-blue-600">Q:</span> {item.input}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features / Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Sparkles className="text-orange-600 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2">Hybrid Engine</h3>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              Combines rule-based mapping with advanced AI to handle slang, spelling variations, and context.
            </p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <History className="text-blue-600 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2">Smart Learning</h3>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              Our system logs unknown phrases to improve accuracy over time through community-driven data.
            </p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Languages className="text-green-600 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2">Bidirectional</h3>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              Seamlessly switch between Benglish-to-English and English-to-Benglish for natural conversations.
            </p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <WifiOff className="text-amber-600 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2">Offline Mode</h3>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              Caches common translations and syncs a master dictionary for basic functionality without internet.
            </p>
          </div>
        </div>
      </main>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Import Dataset
                </h2>
                <button 
                  onClick={() => {
                    setShowImportModal(false);
                    setImportStatus(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">CSV Format</label>
                  <div className="flex gap-2 md:gap-4">
                    <button 
                      onClick={() => setImportFormat('benglish-first')}
                      className={cn(
                        "flex-1 py-2 px-3 md:px-4 rounded-lg border text-[11px] md:text-sm transition-all",
                        importFormat === 'benglish-first' ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      Benglish First
                    </button>
                    <button 
                      onClick={() => setImportFormat('english-first')}
                      className={cn(
                        "flex-1 py-2 px-3 md:px-4 rounded-lg border text-[11px] md:text-sm transition-all",
                        importFormat === 'english-first' ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      English First
                    </button>
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Paste CSV Data</label>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="ID,Benglish,Bengali,English,Type,Tense,Synonyms,Sentence Example,Notes,Confidence..."
                    className="w-full h-48 md:h-64 p-3 md:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-[10px] md:text-xs resize-none"
                  />
                </div>

                {importStatus && (
                  <div className={cn(
                    "mb-3 md:mb-4 p-3 md:p-4 rounded-xl flex items-start gap-2 md:gap-3",
                    importStatus.success ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    {importStatus.success ? <Check className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> : <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />}
                    <p className="text-[11px] md:text-sm">{importStatus.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !csvInput.trim()}
                    className={cn(
                      "px-6 md:px-8 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2",
                      csvInput.trim() && !isImporting
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isImporting ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {isImporting ? "Importing..." : "Start Import"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suggest Correction Modal */}
      <AnimatePresence>
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                  Suggest a Correction
                </h2>
                <button 
                  onClick={() => setShowCorrectionModal(false)}
                  className="p-1.5 md:p-2 hover:bg-orange-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5 text-orange-800" />
                </button>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="mb-3 md:mb-4">
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Original Input</p>
                  <div className="p-2.5 md:p-3 bg-gray-50 rounded-lg text-[11px] md:text-sm text-gray-600 border border-gray-100 italic">
                    "{inputText}"
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">AI Translation</p>
                  <div className="p-2.5 md:p-3 bg-gray-50 rounded-lg text-[11px] md:text-sm text-gray-600 border border-gray-100 italic">
                    "{result?.translatedText}"
                  </div>
                </div>

                <div className="mb-4 md:mb-6">
                  <label className="block text-[9px] md:text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 md:mb-2">Your Suggested Translation</label>
                  <textarea
                    value={suggestedText}
                    onChange={(e) => setSuggestedText(e.target.value)}
                    placeholder={`How would you translate this to ${getTargetLang()}?`}
                    className="w-full h-24 md:h-32 p-3 md:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[11px] md:text-sm resize-none"
                  />
                </div>

                {correctionStatus && (
                  <div className={cn(
                    "mb-4 md:mb-6 p-3 md:p-4 rounded-xl flex items-start gap-2 md:gap-3",
                    correctionStatus.success ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    {correctionStatus.success ? <Check className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> : <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />}
                    <p className="text-[11px] md:text-sm">{correctionStatus.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitCorrection}
                    disabled={isSubmittingCorrection || !suggestedText.trim()}
                    className={cn(
                      "px-6 md:px-8 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2",
                      suggestedText.trim() && !isSubmittingCorrection
                        ? "bg-orange-600 text-white hover:bg-orange-700 shadow-md"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isSubmittingCorrection ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {isSubmittingCorrection ? "Submitting..." : "Submit Correction"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-8 md:py-12 px-4 md:px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Benglishify.in</h2>
            <p className="text-gray-400 text-xs md:text-sm">© 2026 Benglishify.in for the Bengali community.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/about" 
              className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Info className="w-5 h-5" />
              <span>About</span>
            </Link>
            <a 
              href="https://github.com/rickhub0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
            <a 
              href="https://www.instagram.com/clickors/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Instagram className="w-5 h-5" />
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </footer>
      {/* Grammarly Modal */}
      <AnimatePresence>
        {showGrammarModal && grammarResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Grammar Check</h3>
                </div>
                <button 
                  onClick={() => setShowGrammarModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {grammarResult.isCorrect ? (
                  <div className="flex flex-col items-center text-center space-y-3 py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-700 text-lg">Perfect!</h4>
                      <p className="text-gray-500 text-sm">Your grammar is already correct.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Original</label>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-xl text-sm italic border border-gray-100">
                          {grammarResult.originalText}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1.5 block">Suggested Correction</label>
                        <p className="text-gray-900 bg-blue-50 p-3 rounded-xl text-sm font-medium border border-blue-100">
                          {grammarResult.correctedText}
                        </p>
                      </div>
                    </div>

                    {grammarResult.explanation && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Why this change?</p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            {grammarResult.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowGrammarModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                {!grammarResult.isCorrect && (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(grammarResult.correctedText);
                        // Maybe show a toast or change icon briefly
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={applyGrammarCorrection}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                      Apply
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TranslatorContent />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { 
  Languages, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Sparkles, 
  History, 
  Info, 
  Loader2, 
  Settings, 
  X, 
  AlertCircle, 
  Mic, 
  MicOff, 
  Volume2, 
  CheckCircle, 
  XCircle, 
  Wand2, 
  Github, 
  Instagram, 
  Share2, 
  Smartphone,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translate, TranslationResult, syncMasterDictionary } from "./services/translationService";
import { submitCorrection } from "./services/correctionService";
import { speechService } from "./services/speechService";
import { transliterationService } from "./services/transliterationService";
import { checkGrammar, GrammarCheckResult } from "./services/grammarlyService";
import { TranslationDirection, ConversationContext } from "./services/geminiService";
import { cn } from "./lib/utils";
import Layout from "./components/Layout";
import AboutPage from "./pages/About";
import InstallGuide from "./pages/InstallGuide";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function TranslatorContent() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [direction, setDirection] = useState<TranslationDirection>('benglish-to-english');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<ConversationContext[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Correction State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(true); // Default to voice mode for better UX
  const [voiceSearchLang, setVoiceSearchLang] = useState<'bn-BD' | 'en-US'>('bn-BD');
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
    const debounceTime = inputText.length < 10 ? 150 : 300;
    const timer = setTimeout(() => {
      handleTranslate();
    }, debounceTime); 

    return () => clearTimeout(timer);
  }, [inputText, direction, isVoiceMode]);

  useEffect(() => {
    if (user) {
      syncMasterDictionary();
    }
  }, [user]);

  const handleTranslate = async (overrideDirection?: TranslationDirection, overrideText?: string) => {
    const textToTranslate = overrideText || inputText;
    if (!textToTranslate.trim()) return;
    
    // Only show loading if it's taking more than 200ms to avoid flickering for cached results
    const loadingTimer = setTimeout(() => setIsLoading(true), 200);
    setTranslationError(null);
    try {
      const translationDirection = overrideDirection || direction;
      const translation = await translate(textToTranslate, translationDirection, history);
      setResult(translation);
      
      // For voice input, update the live previews with the AI-refined results
      if (translation.fullResult) {
        setLiveBenglish(translation.fullResult.benglish);
        setLiveBengali(translation.fullResult.bengali);
      }
      
      // Update history for context
      setHistory(prev => {
        const newEntry = { input: textToTranslate, output: translation.translatedText };
        const updated = [...prev, newEntry];
        return updated.slice(-5); // Keep last 5 for context
      });
    } catch (error: any) {
      console.error("Translation error:", error);
      setTranslationError(error.message || "An unexpected error occurred during translation.");
    } finally {
      clearTimeout(loadingTimer);
      setIsLoading(false);
    }
  };

  const handleShareResult = async () => {
    if (!result) return;
    
    const sourceLang = direction.includes('benglish') ? 'Benglish' : direction.includes('bengali') ? 'Bengali' : 'English';
    const targetLang = direction.endsWith('english') ? 'English' : direction.endsWith('benglish') ? 'Benglish' : 'Bengali';
    
    const shareText = `Benglishify.in | Smart Translator\n\n${sourceLang}: ${inputText}\n${targetLang}: ${result.translatedText}\n\n✨ Translated via https://benglishify.in`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Benglishify.in Translation',
          text: shareText,
          url: 'https://benglishify.in'
        });
      } catch (err) {
        // Fallback if user cancels or error
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
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

  const copyToClipboard = (text?: string) => {
    const textToCopy = text || result?.translatedText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
    
    // Determine language code based on current selection
    const langCode = voiceSearchLang;

    speechService.startListening(
      langCode,
      (transcript, isFinal) => {
        setInputText(transcript);
        setLiveBengali(transcript);
        setLiveBenglish(transliterationService.transliterate(transcript));
        
        if (isFinal) {
          setIsListening(false);
          // Auto-translate using the special 'voice-input' direction
          handleTranslate('voice-input' as TranslationDirection, transcript);
        }
      },
      (error) => {
        console.error("Speech error:", error);
        setSpeechError(error);
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
    if (err.includes('no-speech')) return "No speech was detected. Please try again and speak clearly.";
    if (err.includes('audio-capture')) return "No microphone found. Please ensure your mic is connected and working.";
    if (err.includes('not-allowed') || err.includes('permission')) return "Microphone access denied. Please enable it in your browser settings.";
    if (err.includes('network')) return "Network error. Please check your internet connection.";
    if (err.includes('aborted')) return "Speech recognition was aborted.";
    if (err.includes('language-not-supported')) return "This language is not supported for voice input in your browser.";
    if (err.includes('not supported')) return "Speech recognition is not supported in this browser. Try using Chrome for the best experience.";
    return error || "An unexpected error occurred with voice input.";
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 mb-12">
      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8 md:gap-12">
        {/* Mode Toggle */}
        <div className="flex flex-col gap-6 md:gap-8">
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
            <div className="bg-gray-100 dark:bg-[#1E1E1E] p-1 rounded-xl flex gap-1 border border-transparent dark:border-[#2E2E2E]">
              <button 
                onClick={() => setIsVoiceMode(true)}
                className={cn(
                  "px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2",
                  isVoiceMode ? "bg-white dark:bg-[#2E2E2E] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Voice
              </button>
              <button 
                onClick={() => setIsVoiceMode(false)}
                className={cn(
                  "px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2",
                  !isVoiceMode ? "bg-white dark:bg-[#2E2E2E] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
              <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-100 dark:border-[#2E2E2E] p-6 md:p-10 flex-1 flex flex-col gap-6 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        isListening ? "bg-red-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"
                      )} />
                      <span className="text-[11px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">
                        {voiceSearchLang === 'en-US' ? 'English Input' : 'Bengali Input'}
                      </span>
                    </div>
                    
                    {/* Voice Language Toggle */}
                    <div className="flex bg-gray-100 dark:bg-[#2E2E2E] p-0.5 rounded-lg text-[9px] font-bold uppercase overflow-hidden border border-transparent dark:border-[#3E3E3E]">
                      <button 
                        onClick={() => setVoiceSearchLang('bn-BD')}
                        className={cn(
                          "px-2 py-1 rounded transition-all",
                          voiceSearchLang === 'bn-BD' ? "bg-white dark:bg-[#3E3E3E] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500"
                        )}
                      >
                        Bengali
                      </button>
                      <button 
                        onClick={() => setVoiceSearchLang('en-US')}
                        className={cn(
                          "px-2 py-1 rounded transition-all",
                          voiceSearchLang === 'en-US' ? "bg-white dark:bg-[#3E3E3E] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500"
                        )}
                      >
                        English
                      </button>
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
                      <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">Benglish</span>
                      <div className={cn(
                        "text-3xl md:text-5xl font-black leading-[1.1] tracking-tight transition-all",
                        isListening ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white",
                        !liveBenglish && !isListening && "text-gray-200 dark:text-gray-800"
                      )}>
                        {liveBenglish || (isListening ? "..." : "Speak now")}
                      </div>
                    </div>

                    {/* Secondary: Bengali Script */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bengali Script</span>
                      <div className={cn(
                        "text-xl md:text-2xl font-medium leading-relaxed transition-all",
                        isListening ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500",
                        !liveBengali && !isListening && "text-gray-100 dark:text-[#1A1A1A]"
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
              <div className="flex flex-col gap-6">
                <div className={cn(
                  "bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl border border-gray-100 dark:border-[#2E2E2E] p-6 md:p-10 flex-1 flex flex-col gap-6 relative transition-all",
                  isLoading && "opacity-60 grayscale-[0.5]"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">English Translation</span>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />}
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
                          <div className="text-2xl md:text-4xl font-bold text-gray-800 dark:text-white leading-tight">
                            {result.fullResult?.english || result.translatedText}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-900/30">
                              {result.source.replace('-', ' ')}
                            </span>
                            <div className="flex gap-2">
                              <button onClick={handleSpeak} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#2E2E2E] hover:bg-gray-100 dark:hover:bg-[#3E3E3E] text-gray-500 dark:text-gray-400 transition-all">
                                <Volume2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => copyToClipboard()} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#2E2E2E] hover:bg-gray-100 dark:hover:bg-[#3E3E3E] text-gray-500 dark:text-gray-400 transition-all">
                                {copied ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="text-gray-200 dark:text-[#2A2A2A] text-2xl md:text-4xl font-bold italic">
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
                  className="flex items-center justify-center gap-2 py-4 rounded-3xl text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <X className="w-4 h-4" />
                  Reset Session
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Existing Text Translation UI */
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                  className="absolute top-3 md:top-4 left-4 md:left-6 flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-red-200 dark:border-red-900/30 text-[9px] md:text-[10px] font-bold tracking-widest uppercase z-10"
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
                }}
                placeholder={isListening ? "Speak now..." : `Enter ${getSourceLang()}...`}
                className={cn(
                  "w-full h-full min-h-[150px] md:min-h-[200px] resize-none border-none focus:ring-0 text-lg md:text-xl placeholder:text-gray-300 dark:placeholder:text-[#2A2A2A] bg-transparent text-gray-800 dark:text-white transition-all outline-none",
                  isListening && "placeholder:text-red-300 dark:placeholder:text-red-900/50"
                )}
              />
              {inputText && !isListening && (
                <button
                  onClick={() => {
                    setInputText("");
                    setResult(null);
                  }}
                  className="absolute top-4 md:top-6 right-4 md:right-6 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2E2E] text-gray-400 dark:text-gray-500 transition-all font-sans"
                  title="Clear text"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex items-center gap-2 md:gap-3">
                <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-600 font-sans">{inputText.length} / 5000</span>
                <button
                  onClick={handleVoiceInput}
                  className={cn(
                    "p-1.5 md:p-2 rounded-full transition-all",
                    isListening ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse" : "bg-gray-100 dark:bg-[#2E2E2E] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3E3E3E]"
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
                      ? "text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                      : "text-gray-300 dark:text-gray-700 cursor-not-allowed"
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
              "p-4 md:p-6 bg-gray-50/30 dark:bg-black/10 relative flex flex-col",
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
                    <p className="text-lg md:text-xl leading-relaxed text-gray-800 dark:text-gray-200 font-sans">
                      {result.translatedText}
                    </p>
                    <div className="mt-3 md:mt-4 flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded font-sans",
                        result.source === 'rule-based' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : 
                        "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                      )}>
                        {result.source.replace('-', ' ')}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-600 font-sans">
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => {
                          setSuggestedText("");
                          setCorrectionStatus(null);
                          setShowCorrectionModal(true);
                        }}
                        className="ml-auto md:ml-2 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 text-orange-600 dark:text-orange-400 transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-wider border border-orange-100/50 dark:border-orange-900/30 font-sans"
                        title="Suggest a better translation"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Suggest Correction
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div key="placeholder" className="flex-1 flex items-center justify-center text-gray-300 dark:text-[#2A2A2A] italic text-sm md:text-base font-sans transition-colors">
                    {isLoading ? "Translating..." : "Translation will appear here"}
                  </div>
                )}
              </AnimatePresence>

              {result && (
                <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex items-center gap-1.5 md:gap-2">
                  <button
                    onClick={() => handleGrammarCheck(result.translatedText, direction.split('-to-')[1] as 'benglish' | 'english')}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 dark:text-blue-400 transition-colors"
                    title="Check translation grammar"
                  >
                    <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={handleShareResult}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 dark:text-blue-400 transition-colors"
                    title="Share translation"
                  >
                    <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={handleSpeak}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                    title="Listen to translation"
                  >
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard()}
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
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-black/10 border border-gray-100 dark:border-[#2E2E2E] rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                Recent Context
              </h4>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setHistory([])}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  title="Clear context for next translation"
                >
                  Clear Context
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-[#2E2E2E] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#3E3E3E] text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Q:</span> {item.input}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features / Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 dark:border-[#2E2E2E] shadow-sm transition-colors">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Sparkles className="text-orange-600 dark:text-orange-400 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2 dark:text-white">Hybrid Engine</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Combines rule-based mapping with advanced AI to handle slang, spelling variations, and context.
            </p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 dark:border-[#2E2E2E] shadow-sm transition-colors">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <History className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2 dark:text-white">Smart Learning</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Our system logs unknown phrases to improve accuracy over time through community-driven data.
            </p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 dark:border-[#2E2E2E] shadow-sm transition-colors">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/20 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Languages className="text-green-600 dark:text-green-400 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-base font-semibold mb-1 md:mb-2 dark:text-white">Bidirectional</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Seamlessly switch between Benglish-to-English and English-to-Benglish for natural conversations.
            </p>
          </div>
        </div>
      </main>

      {/* Suggest Correction Modal */}
      <AnimatePresence>
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-transparent dark:border-[#2E2E2E]"
            >
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 dark:border-[#2E2E2E] flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/20">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
                  Suggest a Correction
                </h2>
                <button 
                  onClick={() => setShowCorrectionModal(false)}
                  className="p-1.5 md:p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5 text-orange-800 dark:text-orange-400" />
                </button>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="mb-3 md:mb-4">
                  <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1">Original Input</p>
                  <div className="p-2.5 md:p-3 bg-gray-50 dark:bg-[#121212] rounded-lg text-[11px] md:text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-[#2E2E2E] italic">
                    "{inputText}"
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1">AI Translation</p>
                  <div className="p-2.5 md:p-3 bg-gray-50 dark:bg-[#121212] rounded-lg text-[11px] md:text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-[#2E2E2E] italic">
                    "{result?.translatedText}"
                  </div>
                </div>

                <div className="mb-4 md:mb-6">
                  <label className="block text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1.5 md:mb-2">Your Suggested Translation</label>
                  <textarea
                    value={suggestedText}
                    onChange={(e) => setSuggestedText(e.target.value)}
                    placeholder={`How would you translate this to ${getTargetLang()}?`}
                    className="w-full h-24 md:h-32 p-3 md:p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2E2E2E] rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[11px] md:text-sm text-gray-800 dark:text-white transition-all outline-none resize-none font-sans"
                  />
                </div>

                {correctionStatus && (
                  <div className={cn(
                    "mb-4 md:mb-6 p-3 md:p-4 rounded-xl flex items-start gap-2 md:gap-3",
                    correctionStatus.success ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30"
                  )}>
                    {correctionStatus.success ? <Check className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> : <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />}
                    <p className="text-[11px] md:text-sm font-sans">{correctionStatus.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-full font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitCorrection}
                    disabled={isSubmittingCorrection || !suggestedText.trim()}
                    className={cn(
                      "px-6 md:px-8 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2 shadow-sm font-sans",
                      suggestedText.trim() && !isSubmittingCorrection
                        ? "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md"
                        : "bg-gray-100 dark:bg-[#2E2E2E] text-gray-400 dark:text-gray-600 cursor-not-allowed"
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

      {/* Grammarly Modal */}
      <AnimatePresence>
        {showGrammarModal && grammarResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-transparent dark:border-[#2E2E2E]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-[#2E2E2E] flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Grammar Check</h3>
                </div>
                <button 
                  onClick={() => setShowGrammarModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {grammarResult.isCorrect ? (
                  <div className="flex flex-col items-center text-center space-y-3 py-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-700 dark:text-green-400 text-lg">Perfect!</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Your grammar is already correct.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1.5 block">Original</label>
                        <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#121212] p-3 rounded-xl text-sm italic border border-gray-100 dark:border-[#2E2E2E]">
                          {grammarResult.originalText}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-blue-400 dark:text-blue-500 mb-1.5 block">Suggested Correction</label>
                        <p className="text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-sm font-medium border border-blue-100 dark:border-blue-900/30">
                          {grammarResult.correctedText}
                        </p>
                      </div>
                    </div>

                    {grammarResult.explanation && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                        <Info className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">Why this change?</p>
                          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                            {grammarResult.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-black/10 border-t border-gray-100 dark:border-[#2E2E2E] flex gap-3">
                <button
                  onClick={() => setShowGrammarModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  Close
                </button>
                {!grammarResult.isCorrect && (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(grammarResult.correctedText);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={applyGrammarCorrection}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md transition-all active:scale-95"
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
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<TranslatorContent />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/install" element={<InstallGuide />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

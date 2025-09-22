import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

// Fix: Define an interface for the SpeechRecognition instance to provide type information
// and resolve name conflicts with the `SpeechRecognition` constant.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: (event: any) => void;
  onend: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  start: () => void;
  stop: () => void;
}

// Fix: Cast `window` to `any` to access vendor-prefixed or non-standard APIs.
// This resolves errors about `SpeechRecognition` and `webkitSpeechRecognition` not existing on `window`.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeech = (language: Language) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Fix: Use the `SpeechRecognition` interface for the state's type.
  // This resolves the error "'SpeechRecognition' refers to a value, but is being used as a type here."
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }
    const rec: SpeechRecognition = new SpeechRecognition();
    rec.continuous = true;
    rec.lang = language;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    rec.onspeechstart = () => {
      setIsProcessing(true);
    };

    rec.onspeechend = () => {
      setIsProcessing(false);
    };
    
    rec.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
    };

    setRecognition(rec);
  }, [language]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [recognition, isListening]);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    speechSynthesis.speak(utterance);
  }, [language]);

  return {
    transcript,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    speak,
    hasRecognitionSupport: !!SpeechRecognition,
  };
};
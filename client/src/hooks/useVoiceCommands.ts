import { useEffect } from 'react';

interface VoiceCommand {
  keywords: string[];
  action: () => void;
}

export function useVoiceCommands(
  transcript: string,
  commands: VoiceCommand[],
  language: 'ar' | 'en' = 'ar'
) {
  useEffect(() => {
    if (!transcript) return;

    const lowerTranscript = transcript.toLowerCase().trim();

    for (const command of commands) {
      for (const keyword of command.keywords) {
        if (lowerTranscript.includes(keyword.toLowerCase())) {
          command.action();
          break;
        }
      }
    }
  }, [transcript, commands, language]);
}

// Common voice commands in Arabic and English
export const VOICE_COMMANDS = {
  next: {
    ar: ['التالي', 'التالى', 'بعدي', 'بعدى', 'نيكست', 'next'],
    en: ['next', 'continue', 'proceed'],
  },
  previous: {
    ar: ['السابق', 'قبل', 'رجوع', 'باك', 'back'],
    en: ['previous', 'back', 'go back'],
  },
  submit: {
    ar: ['إرسال', 'ارسال', 'أرسل', 'submit', 'سبمت'],
    en: ['submit', 'send', 'finish'],
  },
  repeat: {
    ar: ['إعادة', 'اعادة', 'كرر', 'repeat', 'ريبيت'],
    en: ['repeat', 'replay', 'again'],
  },
  yes: {
    ar: ['نعم', 'أيوه', 'yes'],
    en: ['yes', 'yeah', 'sure'],
  },
  no: {
    ar: ['لا', 'لأ', 'no'],
    en: ['no', 'nope'],
  },
};

export function extractNumberFromTranscript(transcript: string, max: number = 10): number | null {
  const numberWords = {
    ar: {
      'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'أربعة': 4, 'خمسة': 5,
      'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    },
    en: {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    }
  };

  const lowerTranscript = transcript.toLowerCase().trim();

  // Check for digit numbers
  const digitMatch = lowerTranscript.match(/\d+/);
  if (digitMatch) {
    const num = parseInt(digitMatch[0]);
    if (num >= 1 && num <= max) {
      return num;
    }
  }

  // Check for word numbers in Arabic
  for (const [word, value] of Object.entries(numberWords.ar)) {
    if (lowerTranscript.includes(word) && value <= max) {
      return value;
    }
  }

  // Check for word numbers in English
  for (const [word, value] of Object.entries(numberWords.en)) {
    if (lowerTranscript.includes(word) && value <= max) {
      return value;
    }
  }

  return null;
}

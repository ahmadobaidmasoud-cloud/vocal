// ElevenLabs TTS Service
// Using native fetch (Node.js 18+)

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for different languages
const VOICE_IDS = {
  ar: '21m00Tcm4TlvDq8ikWAM', // Rachel (works with Arabic)
  en: '21m00Tcm4TlvDq8ikWAM', // Rachel
};

export async function generateTTS(text: string, language: 'ar' | 'en' = 'ar'): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const voiceId = VOICE_IDS[language];
  const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// For MVP, we'll generate TTS on-the-fly
// In production, cache audio files to avoid repeated API calls
export async function generateQuestionAudio(questionText: string, language: 'ar' | 'en'): Promise<string> {
  try {
    const audioBuffer = await generateTTS(questionText, language);
    
    // Convert to base64 data URI for inline embedding
    const base64Audio = audioBuffer.toString('base64');
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Error generating TTS:', error);
    // Return empty string if TTS fails - frontend will handle gracefully
    return '';
  }
}

// Speechmatics Real-Time Speech Recognition Service
// Using Official @speechmatics/real-time-client SDK (v8.2.0)

import { RealtimeClient } from '@speechmatics/real-time-client';

export interface TranscriptPayload {
  questionId: string;
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechmaticsConfig {
  questionId: string;
  language: 'ar' | 'en';
  jwt: string;
  onPartialTranscript?: (payload: TranscriptPayload) => void;
  onFinalTranscript?: (payload: TranscriptPayload) => void;
  onError?: (error: string) => void;
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
}

export class SpeechmaticsService {
  private client: RealtimeClient | null = null;
  private config: SpeechmaticsConfig;
  private isActive = false;
  private finalTranscript = '';
  
  // ✅ OPTIMIZATION: Reuse audio pipeline between sessions
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null; // ✅ iOS Safari fix: Control mic via gain instead of stop/start

  constructor(config: SpeechmaticsConfig) {
    this.config = config;
  }

  // ✅ Update config for new question (reuse same service instance!)
  updateConfig(newConfig: Partial<SpeechmaticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('Speechmatics session already active');
      return;
    }

    try {
      // Create RealtimeClient
      this.client = new RealtimeClient({
        url: 'wss://eu2.rt.speechmatics.com/v2',
      });

      // Set up event listeners before starting
      this.setupEventListeners();

      // Start recognition session with JWT
      await this.client.start(this.config.jwt, {
        audio_format: {
          type: 'raw',
          encoding: 'pcm_s16le',
          sample_rate: 16000,
        },
        transcription_config: {
          language: this.config.language,
          operating_point: 'enhanced',
          max_delay: 0.7,
          max_delay_mode: 'flexible',
          enable_partials: true,
          enable_entities: false,
        },
      });

      // Start microphone capture and audio streaming
      await this.startMicrophoneCapture();

      this.isActive = true;
      console.log('✅ Speechmatics started successfully');

    } catch (error: any) {
      console.error('Failed to start Speechmatics:', error);
      this.config.onError?.(error.message || 'Failed to start recognition');
      this.isActive = false;
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    // Listen to all server messages
    this.client.addEventListener('receiveMessage', (event: any) => {
      const message = event.data;

      switch (message.message) {
        case 'RecognitionStarted':
          console.log('✅ Recognition session started');
          this.config.onSessionStarted?.();
          break;

        case 'AddPartialTranscript':
          {
            const transcript = message.metadata?.transcript || '';
            const confidence = message.results?.[0]?.alternatives?.[0]?.confidence || 0.85;
            
            if (transcript.trim()) {
              this.config.onPartialTranscript?.({
                questionId: this.config.questionId,
                text: transcript,
                confidence,
                isFinal: false,
              });
            }
          }
          break;

        case 'AddTranscript':
          {
            const transcript = message.metadata?.transcript || '';
            const confidence = message.results?.[0]?.alternatives?.[0]?.confidence || 0.95;
            
            if (transcript.trim()) {
              // Append to final transcript
              this.finalTranscript += (this.finalTranscript ? ' ' : '') + transcript;
              this.config.onFinalTranscript?.({
                questionId: this.config.questionId,
                text: this.finalTranscript,
                confidence,
                isFinal: true,
              });
            }
          }
          break;

        case 'EndOfTranscript':
          console.log('✅ End of transcript');
          this.config.onSessionEnded?.();
          break;

        case 'Error':
          {
            const errorType = message.type || 'unknown_error';
            const errorReason = message.reason || 'Recognition error';
            
            console.error('❌ Speechmatics error:', message);
            
            // Handle specific errors
            if (errorType === 'not_authorised') {
              this.config.onError?.('توكن غير صالح - يرجى إعادة المحاولة');
            } else if (errorType === 'insufficient_funds') {
              this.config.onError?.('رصيد Speechmatics منتهي');
            } else {
              this.config.onError?.(errorReason);
            }
          }
          break;

        case 'Warning':
          console.warn('⚠️ Speechmatics warning:', message);
          break;
      }
    });
  }

  private async startMicrophoneCapture(): Promise<void> {
    try {
      // ✅ OPTIMIZATION: Reuse existing audio pipeline if available (saves ~100ms)
      if (this.mediaStream && this.audioContext && this.processor && this.source && this.micGainNode) {
        console.log('♻️ Reusing existing audio pipeline');
        return;
      }

      // Get microphone stream (first time only)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio processing chain (first time only)
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      await this.audioContext.resume(); // ✅ iOS Safari: Resume context from user gesture
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // ✅ iOS Safari fix: Add GainNode to control mic mute/unmute without stopping stream
      this.micGainNode = this.audioContext.createGain();
      this.micGainNode.gain.value = 1; // Start unmuted
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Process and send audio data
      this.processor.onaudioprocess = (e) => {
        if (!this.client || !this.isActive) return;

        const audioData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(audioData.length);

        // Convert Float32 to Int16 (PCM S16 LE)
        for (let i = 0; i < audioData.length; i++) {
          const sample = Math.max(-1, Math.min(1, audioData[i]));
          int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send audio to Speechmatics via SDK
        this.client.sendAudio(int16Data.buffer);
      };

      // Connect audio pipeline with gain node
      this.source.connect(this.micGainNode);
      this.micGainNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('🎤 Microphone capture started with GainNode control');

    } catch (error: any) {
      console.error('Microphone error:', error);
      this.config.onError?.('تعذر الوصول للميكروفون');
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;

    try {
      // ✅ Set isActive=false IMMEDIATELY to allow next session to start
      this.isActive = false;
      this.finalTranscript = '';

      // Stop recognition session (but keep audio pipeline alive!)
      if (this.client) {
        await this.client.stopRecognition();
        this.client = null;
      }

      console.log('🛑 Speechmatics session stopped (audio pipeline kept alive)');

    } catch (error) {
      console.error('Error stopping Speechmatics:', error);
      // Ensure isActive is false even on error
      this.isActive = false;
    }
  }

  // ✅ Cleanup audio resources when survey is complete
  async cleanup(): Promise<void> {
    try {
      // Disconnect audio processor
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }

      // Stop microphone stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      console.log('🧹 Audio pipeline cleaned up');
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  reset(): void {
    this.finalTranscript = '';
  }

  // ✅ iOS Safari fix: Mute mic via GainNode (keeps stream alive)
  muteAudio(): void {
    if (this.micGainNode) {
      this.micGainNode.gain.value = 0;
      console.log('🔇 Microphone muted (gain = 0)');
    }
  }

  // ✅ iOS Safari fix: Unmute mic via GainNode
  async unmuteAudio(): Promise<void> {
    if (this.micGainNode && this.audioContext) {
      try {
        await this.audioContext.resume(); // ✅ Safari requires resume
        this.micGainNode.gain.value = 1;
        console.log('🔊 Microphone unmuted (gain = 1)');
      } catch (error) {
        console.error('Error unmuting audio:', error);
      }
    }
  }
}

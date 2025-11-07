// Speechmatics Real-Time Speech Recognition Service
// Uses WebSocket API directly for browser-based STT

export interface SpeechmaticsConfig {
  language: 'ar' | 'en';
  apiKey: string;
  onPartialTranscript?: (text: string, confidence: number) => void;
  onFinalTranscript?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
}

export class SpeechmaticsService {
  private ws: WebSocket | null = null;
  private config: SpeechmaticsConfig;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isActive = false;
  private finalTranscript = '';

  constructor(config: SpeechmaticsConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('Speechmatics session already active');
      return;
    }

    try {
      // Connect to Speechmatics WebSocket
      const wsUrl = `wss://eu2.rt.speechmatics.com/v2?jwt=${this.config.apiKey}`;
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      // Set up WebSocket event handlers
      this.ws.onopen = () => {
        console.log('✅ Connected to Speechmatics');
        this.sendStartRecognition();
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Speechmatics WebSocket error:', error);
        this.config.onError?.('Connection error');
      };

      this.ws.onclose = () => {
        console.log('Speechmatics connection closed');
        this.isActive = false;
        this.config.onSessionEnded?.();
      };

    } catch (error: any) {
      console.error('Failed to start Speechmatics:', error);
      this.config.onError?.(error.message || 'Failed to start');
      this.isActive = false;
    }
  }

  private sendStartRecognition(): void {
    if (!this.ws) return;

    const startMessage = {
      message: 'StartRecognition',
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
      },
    };

    this.ws.send(JSON.stringify(startMessage));
  }

  private handleMessage(message: any): void {
    switch (message.message) {
      case 'RecognitionStarted':
        console.log('✅ Recognition started');
        this.isActive = true;
        this.config.onSessionStarted?.();
        // Start microphone capture
        this.startMicrophoneCapture();
        break;

      case 'AddPartialTranscript':
        {
          const text = message.metadata?.transcript || '';
          const confidence = message.results?.[0]?.alternatives?.[0]?.confidence || 0.85;
          this.config.onPartialTranscript?.(text, confidence);
        }
        break;

      case 'AddTranscript':
        {
          const text = message.metadata?.transcript || '';
          const confidence = message.results?.[0]?.alternatives?.[0]?.confidence || 0.95;
          
          // Append to final transcript (no duplicates)
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + text;
          
          this.config.onFinalTranscript?.(this.finalTranscript, confidence);
        }
        break;

      case 'EndOfTranscript':
        console.log('End of transcript');
        break;

      case 'Error':
        console.error('Speechmatics error:', message);
        this.config.onError?.(message.type || 'Unknown error');
        break;

      case 'Warning':
        console.warn('Speechmatics warning:', message);
        break;
    }
  }

  private async startMicrophoneCapture(): Promise<void> {
    try {
      // Request microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio processing chain
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isActive) return;

        const audioData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(audioData.length);

        // Convert Float32 to Int16 (PCM S16 LE)
        for (let i = 0; i < audioData.length; i++) {
          const sample = Math.max(-1, Math.min(1, audioData[i]));
          int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send audio to Speechmatics
        this.ws.send(int16Data.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('🎤 Microphone capture started');

    } catch (error: any) {
      console.error('Microphone error:', error);
      this.config.onError?.('Microphone access denied');
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Stop microphone
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // End recognition
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ message: 'EndOfStream' }));
        this.ws.close();
      }

      this.ws = null;
      this.isActive = false;
      this.finalTranscript = '';

      console.log('🛑 Speechmatics stopped');

    } catch (error) {
      console.error('Error stopping Speechmatics:', error);
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  reset(): void {
    this.finalTranscript = '';
  }
}

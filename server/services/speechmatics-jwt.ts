// Speechmatics JWT Token Generation
// Creates short-lived JWT tokens for secure browser-based STT

import jwt from 'jsonwebtoken';

const API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_URL = 'wss://eu2.rt.speechmatics.com/v2';

export interface SpeechmaticsJWTPayload {
  type: 'speechmatics_jwt';
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Generate a secure temporary JWT for Speechmatics
 * Following Speechmatics JWT spec: https://docs.speechmatics.com/rt-api-ref
 */
export function generateSpeechmaticsJWT(durationMinutes: number = 60): string {
  if (!API_KEY) {
    throw new Error('SPEECHMATICS_API_KEY not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  
  const payload: SpeechmaticsJWTPayload = {
    type: 'speechmatics_jwt',
    sub: 'vocalsurvey-client',
    iss: 'vocalsurvey-backend',
    aud: SPEECHMATICS_URL.replace('wss:', 'https:'), // Convert wss:// to https:// for aud claim
    iat: now,
    exp: now + (durationMinutes * 60),
  };

  // Sign JWT with API key as secret
  // Speechmatics uses HS256 algorithm
  const token = jwt.sign(payload, API_KEY, {
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Validate a Speechmatics JWT token
 */
export function validateJWT(token: string): boolean {
  if (!API_KEY) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, API_KEY, {
      algorithms: ['HS256'],
    }) as SpeechmaticsJWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return false;
    }

    return decoded.type === 'speechmatics_jwt';
  } catch (error) {
    console.error('JWT validation error:', error);
    return false;
  }
}

/**
 * Get Speechmatics WebSocket URL
 */
export function getSpeechmaticsURL(): string {
  return SPEECHMATICS_URL;
}

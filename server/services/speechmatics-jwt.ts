// Speechmatics JWT Token Generation
// Fetches temporary JWT tokens from Speechmatics Management API

const API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_URL = 'wss://eu2.rt.speechmatics.com/v2';
const MANAGEMENT_API_URL = 'https://mp.speechmatics.com/v1/api_keys';

export interface SpeechmaticsJWTResponse {
  key_value: string;
  expires_at: string;
}

/**
 * Generate a temporary JWT token from Speechmatics Management API
 * Following official spec: https://docs.speechmatics.com/introduction/authentication
 * 
 * This is the ONLY way to get valid JWT tokens for Speechmatics RT API.
 * Manual JWT generation with jsonwebtoken will NOT work.
 */
export async function generateSpeechmaticsJWT(ttl: number = 3600): Promise<string> {
  if (!API_KEY) {
    throw new Error('SPEECHMATICS_API_KEY not configured');
  }

  // Validate TTL (must be 60-3600 seconds per Speechmatics spec)
  if (ttl < 60 || ttl > 3600) {
    throw new Error('TTL must be between 60 and 3600 seconds');
  }

  try {
    const response = await fetch(`${MANAGEMENT_API_URL}?type=rt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ ttl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Speechmatics API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as SpeechmaticsJWTResponse;
    
    if (!data.key_value) {
      throw new Error('No JWT token returned from Speechmatics');
    }

    console.log(`✅ Generated Speechmatics JWT (expires: ${data.expires_at})`);
    return data.key_value;

  } catch (error) {
    console.error('❌ Failed to generate Speechmatics JWT:', error);
    throw error;
  }
}

/**
 * Get Speechmatics WebSocket URL
 */
export function getSpeechmaticsURL(): string {
  return SPEECHMATICS_URL;
}

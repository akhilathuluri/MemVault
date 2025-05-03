import { supabase } from './supabase';

// Generate a random challenge
function generateChallenge(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)));
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
}

// Type definitions for WebAuthn responses
interface PublicKeyCredentialWithAttestation extends PublicKeyCredential {
  response: AuthenticatorAttestationResponse;
}

interface PublicKeyCredentialWithAssertion extends PublicKeyCredential {
  response: AuthenticatorAssertionResponse;
}

// Register a new device for WebAuthn authentication
export async function registerDevice(deviceName: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate a challenge
    const challenge = generateChallenge();

    // Create registration options
    const options: CredentialCreationOptions = {
      publicKey: {
        rp: {
          name: 'Memory App',
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
          name: user.email || '',
          displayName: user.email || '',
        },
        challenge: base64ToArrayBuffer(challenge),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    };

    // Create the credential
    const credential = await navigator.credentials.create(options) as PublicKeyCredentialWithAttestation;
    if (!credential) {
      throw new Error('Failed to create credential');
    }

    // Store the credential
    const { error } = await supabase
      .from('user_credentials')
      .insert([{
        user_id: user.id,
        credential_id: arrayBufferToBase64(credential.rawId),
        public_key: arrayBufferToBase64(credential.response.getPublicKey() as ArrayBuffer),
        device_name: deviceName,
      }]);

    if (error) throw error;

    // Create a challenge for immediate authentication
    const { error: challengeError } = await supabase
      .from('auth_challenges')
      .insert([{
        user_id: user.id,
        challenge: generateChallenge(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      }]);

    if (challengeError) throw challengeError;
  } catch (error) {
    console.error('Error registering device:', error);
    throw error;
  }
}

// Check if the current device is registered
export async function isDeviceRegistered(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: credentials } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return !!credentials;
  } catch (error) {
    console.error('Error checking device registration:', error);
    return false;
  }
}

// Get the list of registered devices
export async function getRegisteredDevices(): Promise<Array<{
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: devices } = await supabase
      .from('user_credentials')
      .select('id, device_name, created_at, last_used_at')
      .eq('user_id', user.id);

    return devices || [];
  } catch (error) {
    console.error('Error getting registered devices:', error);
    return [];
  }
}

// Remove a registered device
export async function removeDevice(deviceId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('user_credentials')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing device:', error);
    throw error;
  }
} 
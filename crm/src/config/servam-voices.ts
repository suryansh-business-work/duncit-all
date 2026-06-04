/**
 * Available Servam (Sarvam Bulbul v2) voices for AI Calls. Sarvam has no live
 * "list voices" API, so this is the single configured source the AI Call voice
 * dropdown reads. Update here to add/remove voices. `value` is the Sarvam
 * speaker name sent to the TTS API; empty value = use the Tech-portal default.
 */
export interface ServamVoice {
  value: string;
  label: string;
}

export const SERVAM_VOICES: ServamVoice[] = [
  { value: '', label: 'Default (Tech portal)' },
  { value: 'anushka', label: 'Anushka (female)' },
  { value: 'manisha', label: 'Manisha (female)' },
  { value: 'vidya', label: 'Vidya (female)' },
  { value: 'arya', label: 'Arya (female)' },
  { value: 'abhilash', label: 'Abhilash (male)' },
  { value: 'karun', label: 'Karun (male)' },
  { value: 'hitesh', label: 'Hitesh (male)' },
];

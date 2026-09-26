import {readCredential} from './credentials.ts';
import {loadServerEnv} from './server-env.ts';

/**
 * The Google Maps Platform key: from the encrypted credentials table first
 * (platform_api / google_maps / api_key / live), then GOOGLE_MAPS_API_KEY in
 * .env for deployments that have not moved it yet.
 */
export function googleMapsKey(): string | null {
  loadServerEnv();
  return (
    readCredential('google_maps', 'api_key') ?? (process.env.GOOGLE_MAPS_API_KEY?.trim() || null)
  );
}

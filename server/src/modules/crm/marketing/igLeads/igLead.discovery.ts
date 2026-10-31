import { SocialAccountModel } from '../social/social.model';
import { socialCredentials } from '../social/social.credentials';
import { graphGet } from '../social/providers/meta';
import { SocialApiError } from '../social/providers/http';
import type { DiscoveredProfile } from './igLead.types';

/**
 * Instagram Business Discovery: the public profile of another business or
 * creator account, read through one of Duncit's own connected Instagram
 * accounts. It is the only official way to read someone else's profile, and
 * it answers for business and creator accounts only — a personal account is
 * not readable, which is also where the line for outreach belongs.
 */
const FIELDS = 'username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url';

interface Discovery {
  business_discovery?: {
    username?: string;
    name?: string;
    biography?: string;
    website?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
  };
}

/** Only a web address is kept — the page renders it as a link, so nothing like `javascript:` gets through. */
function webAddress(raw?: string): string {
  try {
    const url = new URL((raw ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export interface DiscoveryReader {
  read: (username: string) => Promise<DiscoveredProfile | null>;
}

/** A reader bound to the first connected Instagram account, or null when there is none. */
export async function discoveryReader(): Promise<DiscoveryReader | null> {
  const [account, creds] = await Promise.all([
    SocialAccountModel.findOne({ platform: 'INSTAGRAM', status: 'CONNECTED' })
      .select('+access_token external_id')
      .lean<{ external_id: string; access_token?: string }>(),
    socialCredentials('META'),
  ]);
  if (!account?.access_token || !creds) return null;
  const { external_id: igUserId, access_token: token } = account;
  return {
    async read(username) {
      try {
        const res = await graphGet<Discovery>(creds.version, `/${igUserId}`, token, {
          fields: `business_discovery.username(${username}){${FIELDS}}`,
        });
        const found = res.business_discovery;
        if (!found) return null;
        return {
          username: (found.username ?? username).toLowerCase(),
          name: found.name ?? '',
          bio: found.biography ?? '',
          website: webAddress(found.website),
          followers: found.followers_count ?? null,
          follows: found.follows_count ?? null,
          media_count: found.media_count ?? null,
          profile_picture_url: found.profile_picture_url ?? '',
        };
      } catch (error) {
        // A dead token would turn every profile into a skip; that is the run failing.
        if (error instanceof SocialApiError && error.expired) {
          throw new Error('The connected Instagram account needs reconnecting in Social Accounts.');
        }
        // Meta answers a personal or missing account with an error, which for
        // a discovery run is an ordinary "not a business" and is counted as skipped.
        return null;
      }
    },
  };
}

export async function discoveryReady(): Promise<boolean> {
  return (await SocialAccountModel.exists({ platform: 'INSTAGRAM', status: 'CONNECTED' })) !== null;
}

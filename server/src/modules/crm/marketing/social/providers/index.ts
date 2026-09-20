import type {
  ProbeOutcome,
  SocialAppCredentials,
  SocialConnector,
  SocialPlatform,
  SocialProvider,
  SocialPublisher,
  SocialReader,
} from '../social.types';
import { facebookReader } from './facebook';
import { facebookPublisher } from './facebook.publish';
import { instagramReader } from './instagram';
import { instagramPublisher } from './instagram.publish';
import { linkedinConnector, linkedinReader, probeLinkedInApp } from './linkedin';
import { linkedinPublisher } from './linkedin.publish';
import { metaConnector, probeMetaApp } from './meta';
import { probeXApp, xConnector, xReader } from './x';
import { xPublisher } from './x.publish';
import { probeYouTubeApp, youtubeConnector, youtubeReader } from './youtube';
import { youtubePublisher } from './youtube.publish';

/** How each provider app is connected. */
export const CONNECTORS: Record<SocialProvider, SocialConnector> = {
  LINKEDIN: linkedinConnector,
  META: metaConnector,
  X: xConnector,
  YOUTUBE: youtubeConnector,
};

/** How each provider app's keys are proven without anyone signing in. */
export const PROBES: Record<SocialProvider, (creds: SocialAppCredentials) => Promise<ProbeOutcome>> = {
  LINKEDIN: probeLinkedInApp,
  META: probeMetaApp,
  X: probeXApp,
  YOUTUBE: probeYouTubeApp,
};

/** How each platform's accounts are read once connected. */
export const READERS: Record<SocialPlatform, SocialReader> = {
  LINKEDIN: linkedinReader,
  FACEBOOK: facebookReader,
  INSTAGRAM: instagramReader,
  X: xReader,
  YOUTUBE: youtubeReader,
};

/** How each platform is posted to. */
export const PUBLISHERS: Record<SocialPlatform, SocialPublisher> = {
  LINKEDIN: linkedinPublisher,
  FACEBOOK: facebookPublisher,
  INSTAGRAM: instagramPublisher,
  X: xPublisher,
  YOUTUBE: youtubePublisher,
};

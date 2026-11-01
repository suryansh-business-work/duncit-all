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
import { instagramConnector, instagramReader, probeInstagramApp } from './instagram';
import { instagramPublisher } from './instagram.publish';
import { linkedinConnector, linkedinReader, probeLinkedInApp } from './linkedin';
import { linkedinPublisher } from './linkedin.publish';
import { facebookConnector, probeFacebookApp } from './meta';
import { probeThreadsApp, threadsConnector, threadsReader } from './threads';
import { threadsPublisher } from './threads.publish';
import { probeXApp, xConnector, xReader } from './x';
import { xPublisher } from './x.publish';
import { probeYouTubeApp, youtubeConnector, youtubeReader } from './youtube';
import { youtubePublisher } from './youtube.publish';

/** How each network's app is connected — one app, one consent screen per network. */
export const CONNECTORS: Record<SocialProvider, SocialConnector> = {
  INSTAGRAM: instagramConnector,
  FACEBOOK: facebookConnector,
  THREADS: threadsConnector,
  YOUTUBE: youtubeConnector,
  LINKEDIN: linkedinConnector,
  X: xConnector,
};

/** How each network's app keys are proven without anyone signing in. */
export const PROBES: Record<SocialProvider, (creds: SocialAppCredentials) => Promise<ProbeOutcome>> = {
  INSTAGRAM: probeInstagramApp,
  FACEBOOK: probeFacebookApp,
  THREADS: probeThreadsApp,
  YOUTUBE: probeYouTubeApp,
  LINKEDIN: probeLinkedInApp,
  X: probeXApp,
};

/** How each platform's accounts are read once connected. */
export const READERS: Record<SocialPlatform, SocialReader> = {
  INSTAGRAM: instagramReader,
  FACEBOOK: facebookReader,
  THREADS: threadsReader,
  YOUTUBE: youtubeReader,
  LINKEDIN: linkedinReader,
  X: xReader,
};

/** How each platform is posted to. */
export const PUBLISHERS: Record<SocialPlatform, SocialPublisher> = {
  INSTAGRAM: instagramPublisher,
  FACEBOOK: facebookPublisher,
  THREADS: threadsPublisher,
  YOUTUBE: youtubePublisher,
  LINKEDIN: linkedinPublisher,
  X: xPublisher,
};

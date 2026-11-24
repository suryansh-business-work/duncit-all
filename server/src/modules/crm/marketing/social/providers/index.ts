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
import { metaLoginConnector, probeMetaLogin } from './meta.login';
import { probeThreadsApp, threadsConnector, threadsReader } from './threads';
import { threadsPublisher } from './threads.publish';
import { probeXApp, xConnector, xReader } from './x';
import { xPublisher } from './x.publish';
import { probeYouTubeApp, youtubeConnector, youtubeReader } from './youtube';
import { youtubePublisher } from './youtube.publish';

/** How each network's app is connected. Instagram and Facebook share Facebook Login for Business (meta.login.ts). */
export const CONNECTORS: Record<SocialProvider, SocialConnector> = {
  INSTAGRAM: metaLoginConnector,
  FACEBOOK: metaLoginConnector,
  THREADS: threadsConnector,
  YOUTUBE: youtubeConnector,
  LINKEDIN: linkedinConnector,
  X: xConnector,
};

/** How each network's app keys are proven without anyone signing in. */
export const PROBES: Record<SocialProvider, (creds: SocialAppCredentials) => Promise<ProbeOutcome>> = {
  INSTAGRAM: probeMetaLogin('Instagram'),
  FACEBOOK: probeMetaLogin('Facebook'),
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

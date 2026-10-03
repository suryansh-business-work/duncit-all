import {
  PASSWORD_RECOVERY_CHANNELS,
  PASSWORD_RECOVERY_STEP_COUNT,
  passwordRecoveryStepIndex,
  previousRecoveryStep,
  recoveryDestination,
  recoveryResendSeconds,
  normalizeUsername,
  usernameBlocksSave,
  usernameFieldState,
  coverImageUrl,
  isVideoMedia,
  videoSourceUrl,
  imageSourceUrl,
  isReelPreloaded,
  reelFeed,
  shouldExtendReelFeed,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { PasswordRecoveryMock, HandleMock } from './mocks';

export const recoveryAndMediaDemos: PackageDemo[] = [
  defineDemo<PasswordRecoveryMock>({
    id: 'password-recovery',
    title: 'Recovering a forgotten password, step by step',
    note:
      'Move `step` to CODE and `Back goes to` becomes CHANNEL; move it to DONE and Back ' +
      'disappears — the password has already changed, and going back would offer to change ' +
      'it again with a code that was spent. Raise `sentSecondsAgo` past ' +
      '`resendAfterSeconds` and `Resend in` reaches 0, which is when the Resend link wakes up.',
    mock: {
      channel: 'PHONE',
      step: 'CODE',
      extension: '+91',
      number: '9845012345',
      email: 'ravi@duncit.com',
      sentSecondsAgo: 12,
      resendAfterSeconds: 30,
    },
    compute: (mock) => {
      const draft = { email: mock.email, extension: mock.extension, number: mock.number };
      const back = previousRecoveryStep(mock.step);
      const secondsLeft = recoveryResendSeconds({
        lastSentAt: Date.now() - mock.sentSecondsAgo * 1000,
        resendAfterSeconds: mock.resendAfterSeconds,
      });
      return {
        'Code went to': recoveryDestination(mock.channel, draft),
        'Step': `${passwordRecoveryStepIndex(mock.step)} of ${PASSWORD_RECOVERY_STEP_COUNT}`,
        'Back goes to': back ?? '(nowhere — this step is final)',
        'Resend in': `${secondsLeft}s`,
        'Channels offered': PASSWORD_RECOVERY_CHANNELS.join(' · '),
      };
    },
  }),
  defineDemo<HandleMock>({
    id: 'username',
    title: 'The @handle field, and the Save button it gates',
    note:
      "Type into `typed` and watch the status and the link move together. `available` is the " +
      "server's debounced answer — set it false with reason TAKEN to see Save lock.",
    mock: {
      current: 'ravi-9x3m',
      typed: 'ravi-plays',
      available: true,
      reason: null,
    },
    compute: (mock) => {
      const view = usernameFieldState({
        value: normalizeUsername(mock.typed),
        current: mock.current,
        check: { checking: false, available: mock.available, reason: mock.reason },
        origin: 'https://mweb.duncit.com',
      });
      return {
        Status: view.status,
        'Save disabled': String(usernameBlocksSave(view.status, !!mock.current)),
        'Shows as an error': String(view.errored),
        'Profile link': view.link,
      };
    },
  }),
  defineDemo<{ cover: { url: string; type: string }[] }>({
    id: 'cover-media-type',
    title: 'Which cover rows play, and which one a card shows',
    note:
      'The first row is a video stored as IMAGE — exactly what the old ' +
      'extension test wrote for any address carrying a query string. It still ' +
      'reads as a video here, so the hero plays it instead of handing it to an <img> that ' +
      'paints nothing. Delete the .jpg row and `coverImageUrl` answers undefined: a ' +
      'video-only cover has no still, and the card draws its own placeholder rather than a ' +
      'blank tile.',
    mock: {
      cover: [
        { url: 'https://ik.imagekit.io/esdata1/clubs/smashers-united_cfjjLNlMo.mp4?updatedAt=1788852029004', type: 'IMAGE' },
        { url: 'https://ik.imagekit.io/esdata1/clubs/smashers-united-court_8Kd2p.jpg', type: 'IMAGE' },
      ],
    },
    compute: (mock) => ({
      ...Object.fromEntries(
        mock.cover.map((row) => [row.url, `stored ${row.type} · plays: ${String(isVideoMedia(row))}`]),
      ),
      'Card thumbnail': coverImageUrl(mock.cover) ?? '(no still — placeholder)',
    }),
  }),
  defineDemo<{ urls: string[] }>({
    id: 'video-source-url',
    title: 'The URL a video player is actually handed',
    note:
      'Add a `?tr=w-400` to the first url: an explicit transformation is somebody else\'s ' +
      'choice and survives untouched. A Pexels clip is left alone too — only our own ' +
      'ImageKit addresses ask for the stored file, because ImageKit re-encodes a video on ' +
      'delivery and answers 403 once that metered allowance is spent.',
    mock: {
      urls: [
        'https://ik.imagekit.io/esdata1/posts/duncit-story_rVMB846f9.mp4',
        'https://ik.imagekit.io/esdata1/posts/duncit-story_rVMB846f9.mp4?tr=orig-true',
        'https://videos.pexels.com/video-files/3195394/3195394-uhd.mp4',
      ],
    },
    compute: (mock) => Object.fromEntries(mock.urls.map((url) => [url, videoSourceUrl(url)])),
  }),
  defineDemo<{ width: number; urls: string[] }>({
    id: 'image-source-url',
    title: 'The URL a pod card paints its photo from',
    note:
      'Change `width` and only the ImageKit address follows it — ImageKit returns a copy that ' +
      'wide (still WebP), 3-4x fewer bytes than the stored photo for a card. The Pexels photo ' +
      'and the address that already asks for `tr=w-1080` are left exactly as they are.',
    mock: {
      width: 720,
      urls: [
        'https://ik.imagekit.io/esdata1/pods/1000412163_VMVCL3hjz.jpg',
        'https://ik.imagekit.io/esdata1/pods/1000412163_VMVCL3hjz.jpg?tr=w-1080',
        'https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg',
      ],
    },
    compute: (mock) =>
      Object.fromEntries(mock.urls.map((url) => [url, imageSourceUrl(url, mock.width)])),
  }),
  defineDemo<{ seed: number; activeIndex: number; cycles: number; pods: string[] }>({
    id: 'reel-feed',
    title: 'The Explore reel order, and when the next pass is dealt',
    note:
      'Change `seed` and the order reshuffles — that is a new visit. Keep it and reorder ' +
      '`pods`: nothing moves, which is why a refetch after a like or a save never jumps the feed. ' +
      'Push `activeIndex` to within two of the end and `Deal next pass` turns true; raise ' +
      '`cycles` and the feed carries on into a fresh shuffle, never opening on the reel the ' +
      'last pass closed on.',
    mock: {
      seed: 1727950000000,
      activeIndex: 1,
      cycles: 2,
      pods: ['DUN-POD-4821', 'DUN-POD-4822', 'DUN-POD-4823', 'DUN-POD-4824'],
    },
    compute: (mock) => {
      const feed = reelFeed(mock.pods, (pod) => pod, mock.seed, mock.cycles);
      return {
        Order: feed.map((entry) => entry.key).join(' → '),
        'Deal next pass': String(shouldExtendReelFeed(mock.activeIndex, feed.length)),
        'Loading now': feed
          .filter((_, index) => isReelPreloaded(index, mock.activeIndex))
          .map((entry) => entry.key)
          .join(', '),
      };
    },
  }),
];

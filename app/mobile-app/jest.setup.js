/* eslint-disable no-undef */
// RTL v13 auto-extends `expect` with its built-in matchers (toBeOnTheScreen,
// toHaveTextContent, …) when the main entry is imported. The old
// `/extend-expect` subpath was removed in v13.
require('@testing-library/react-native');

// lottie-react-native isn't in the jest-expo transform allow-list and pulls in
// a native module; render it as a plain host View in tests.
jest.mock('lottie-react-native', () => ({
  __esModule: true,
  default: (props) => require('react').createElement(require('react-native').View, props),
}));

// expo-image is a native module; render it as react-native's <Image> so specs
// keep asserting on image structure/props without the native runtime.
jest.mock('expo-image', () => ({
  __esModule: true,
  Image: (props) => require('react').createElement(require('react-native').Image, props),
}));

// react-native-webview is a native module; render it as a plain host View so the
// location map can mount in tests without the native runtime.
jest.mock('react-native-webview', () => ({
  __esModule: true,
  WebView: (props) => require('react').createElement(require('react-native').View, props),
}));

// NetInfo is a native module; default to a no-op subscription (online) so the
// offline banner doesn't require the native runtime. Specs override as needed.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

// expo-location is a native module; default to "denied" so SOS geo-capture is a
// best-effort no-op in tests (the mutation still fires with location: null).
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  getCurrentPositionAsync: jest.fn(),
}));

// expo-document-picker is a native module; default to "cancelled" so the support
// chat document attach is a no-op unless a spec overrides it.
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: null }),
}));

// expo-image-manipulator is a native module; resolve a base64 result so the
// avatar crop pipeline (item 9) runs without the native runtime.
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file://cropped.jpg', base64: 'CROPPED' }),
  SaveFormat: { JPEG: 'jpeg' },
  FlipType: { Horizontal: 'horizontal', Vertical: 'vertical' },
}));

// expo-video is a native module; the player setup callback runs synchronously so
// splash-video specs cover the loop/mute/play wiring without the native runtime.
jest.mock('expo-video', () => ({
  __esModule: true,
  useVideoPlayer: jest.fn((_source, setup) => {
    const player = {
      loop: false,
      muted: false,
      play: jest.fn(),
      pause: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    if (setup) setup(player);
    return player;
  }),
  VideoView: (props) => require('react').createElement(require('react-native').View, props),
}));

// Reanimated 3: install the official jest helpers (worklets run on the JS
// thread; animations resolve immediately under fake timers).
require('react-native-reanimated').setUpTests();

// moti drives decorative state transitions (chevrons, pills); render them as
// plain host Views in tests so specs assert structure, not animation frames.
jest.mock('moti', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    MotiView: (props) => require('react').createElement(View, props),
    AnimatePresence: ({ children }) => children,
  };
});

// Clear the in-memory Earn onboarding draft between tests so a draft written by
// one test never seeds the next (the store persists within a test file).
afterEach(() => {
  try {
    require('./src/stores/onboarding-draft.store').useOnboardingDraftStore.setState({ drafts: {} });
  } catch {
    // Store not loaded in this file — nothing to reset.
  }
});

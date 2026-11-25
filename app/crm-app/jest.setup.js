/* eslint-disable no-undef */
require('@testing-library/react-native');

// Native modules have no runtime under jest. Each one is stubbed to its
// "nothing granted / nothing stored" state; a spec overrides what it tests.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __store: store,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: false, canAskAgain: true }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, currentTime: 0, duration: 0 })),
}));

jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'install-uuid') }));

// The library's own mock: no system bars unless a spec wraps the tree in a
// SafeAreaProvider with the insets it wants to test.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// The date/time picker and the web view are native views: a plain View that
// keeps its props, so a spec can fire onChange or read the html it was given.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = (props) => React.createElement(View, props);
  return {
    __esModule: true,
    default: Picker,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

// The launch video: a player whose events a spec can fire (`__emit`), and a
// plain View for the video surface that keeps its props.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const listeners = new Map();
  const player = {
    muted: false,
    loop: false,
    status: 'idle',
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn((event, listener) => {
      listeners.set(event, listener);
      return { remove: () => listeners.delete(event) };
    }),
  };
  return {
    useVideoPlayer: jest.fn((_source, setup) => {
      setup?.(player);
      return player;
    }),
    VideoView: (props) => React.createElement(View, { ...props, testID: 'video-view' }),
    __player: player,
    __emit: (event, payload) => listeners.get(event)?.(payload),
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = (props) => React.createElement(View, props);
  return { __esModule: true, default: WebView, WebView };
});

// Pickers answer "cancelled" until a spec says what was picked.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: null }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: null }),
}));

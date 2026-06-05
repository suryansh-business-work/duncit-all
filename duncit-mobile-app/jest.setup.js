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

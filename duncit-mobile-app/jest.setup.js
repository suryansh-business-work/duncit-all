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

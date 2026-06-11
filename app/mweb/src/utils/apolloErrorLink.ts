import { onError } from '@apollo/client/link/error';

const NETWORK_FAILURE_PATTERN = /failed to fetch|network request failed|load failed/i;
const FRIENDLY_NETWORK_MESSAGE = 'Unable to connect to server. Please check your internet connection and try again.';

export const apolloErrorLink = onError(({ networkError }) => {
  if (networkError && NETWORK_FAILURE_PATTERN.test(networkError.message)) {
    networkError.message = FRIENDLY_NETWORK_MESSAGE;
  }
});
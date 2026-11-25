import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'tamagui';

jest.mock('@/services/feedback', () => ({ appVersion: () => '1.0.0', submitFeedback: jest.fn() }));
jest.mock('@duncit/logs', () => ({ logs: { mobileApp: { error: jest.fn(), warn: jest.fn() } } }));

import { logs } from '@duncit/logs';
import { submitFeedback } from '@/services/feedback';
import { clearToken, resetTokenCache, setToken } from '@/services/session';
import { renderWithTheme } from '@/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

/** A broken screen shows Retry and Report an Issue, and never takes the app down. */

let shouldThrow = true;
function Flaky() {
  const [n] = useState(0);
  if (shouldThrow) throw new Error(`screen broke ${n}`);
  return <Text>Screen is fine</Text>;
}

beforeEach(async () => {
  shouldThrow = true;
  // Signed out by default: a token stored by an earlier test must not leak into the next one.
  await clearToken();
  resetTokenCache();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

it('catches the crash, logs a scrubbed report, and shows the panel with a reference', () => {
  renderWithTheme(
    <ErrorBoundary route="LeadDetail">
      <Flaky />
    </ErrorBoundary>,
  );
  expect(screen.getByTestId('error-retry')).toBeOnTheScreen();
  expect(logs.mobileApp.error).toHaveBeenCalledWith('crm-app/LeadDetail', expect.any(String), expect.any(Object));
  expect(screen.getByText(/^Reference: /)).toBeOnTheScreen();
});

it('Retry remounts the screen', () => {
  renderWithTheme(
    <ErrorBoundary route="LeadDetail">
      <Flaky />
    </ErrorBoundary>,
  );
  shouldThrow = false;
  fireEvent.press(screen.getByTestId('error-retry'));
  expect(screen.getByText('Screen is fine')).toBeOnTheScreen();
});

it('Report an Issue files a support row for a signed-in person, once', async () => {
  await setToken('t1');
  (submitFeedback as jest.Mock).mockResolvedValue(undefined);
  renderWithTheme(
    <ErrorBoundary route="Dialer">
      <Flaky />
    </ErrorBoundary>,
  );
  fireEvent.press(screen.getByTestId('error-report'));
  await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('screen broke'), 'crm-app/Dialer'));
  expect(logs.mobileApp.warn).toHaveBeenCalledTimes(1);
});

it('says so when the report could not be sent', async () => {
  await setToken('t1');
  (submitFeedback as jest.Mock).mockRejectedValue(new Error('offline'));
  renderWithTheme(
    <ErrorBoundary route="Dialer">
      <Flaky />
    </ErrorBoundary>,
  );
  fireEvent.press(screen.getByTestId('error-report'));
  expect(await screen.findByText('The report could not be sent. Try again in a moment.')).toBeOnTheScreen();
});

it('reports a signed-out crash through its log alone', async () => {
  renderWithTheme(
    <ErrorBoundary route="Login">
      <Flaky />
    </ErrorBoundary>,
  );
  fireEvent.press(screen.getByTestId('error-report'));
  await waitFor(() => expect(logs.mobileApp.warn).toHaveBeenCalled());
  expect(submitFeedback).not.toHaveBeenCalled();
});

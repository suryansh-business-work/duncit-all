import type { CompanionOtpApi } from '@/hooks/useCompanionOtp';

/**
 * A CompanionOtpApi with nothing in flight, plus whatever the case overrides.
 *
 * The hook itself is tested on its own; these suites are about what the panel
 * DOES with each state, so the state is handed in rather than driven through a
 * real request.
 */
export function otpApi(overrides: Partial<CompanionOtpApi> = {}): CompanionOtpApi {
  return {
    activeIndex: null,
    challengeId: '',
    testCode: '',
    sending: false,
    verifying: false,
    error: '',
    start: jest.fn(),
    submit: jest.fn().mockResolvedValue(null),
    cancel: jest.fn(),
    ...overrides,
  };
}

import { describe, expect, it } from 'vitest';
import { venueChatErrorKey } from './queries';

describe('venueChatErrorKey', () => {
  it('tells a refused non-member why the chat is not available', () => {
    expect(venueChatErrorKey({ errors: [{ message: 'No', extensions: { code: 'FORBIDDEN' } }] })).toBe('mweb.venueChat.unavailable');
  });

  it('reads any other failure as the chat not loading', () => {
    expect(venueChatErrorKey({ errors: [{ message: 'No', extensions: { code: 'INTERNAL_SERVER_ERROR' } }] })).toBe('mweb.venueChat.loadFailed');
    expect(venueChatErrorKey(new Error('offline'))).toBe('mweb.venueChat.loadFailed');
    expect(venueChatErrorKey(null)).toBe('mweb.venueChat.loadFailed');
  });
});

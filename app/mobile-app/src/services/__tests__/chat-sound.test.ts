/**
 * The chat ping: one per burst, never with notifications switched off, and
 * silent (never throwing) where expo-audio's native module is missing.
 * Each case loads a fresh module, since the player and the burst gate are
 * module-level by design. expo-audio is required lazily at the first ping —
 * after loading — so the registry is reset (not isolated) to make that require
 * see this case's mock rather than one cached by an earlier case.
 */
jest.mock('../../../assets/sounds/chat-ping-new-message.mp3', () => 7, { virtual: true });

const play = jest.fn();
const seekTo = jest.fn();
const createAudioPlayer = jest.fn(() => ({ volume: 1, play, seekTo }));

function loadWith(audio: unknown, enabled = true): (id: string) => void {
  jest.resetModules();
  jest.doMock('expo-audio', () => audio, { virtual: true });
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module per case (resetModules)
  const prefs = require('@/stores/notification-prefs.store');
  prefs.useNotificationPrefsStore.setState({ enabled });
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module per case (resetModules)
  return require('@/services/chat-sound').pingForMessage;
}

beforeEach(() => {
  play.mockClear();
  seekTo.mockClear();
  createAudioPlayer.mockClear();
});

describe('pingForMessage', () => {
  it('plays the bundled ping from the start, once for a burst', () => {
    const ping = loadWith({ createAudioPlayer });
    ping('m1');
    ping('m2');
    ping('m3');
    expect(createAudioPlayer).toHaveBeenCalledWith(7);
    expect(seekTo).toHaveBeenCalledWith(0);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays silent when notifications are switched off on this device', () => {
    const ping = loadWith({ createAudioPlayer }, false);
    ping('m1');
    expect(play).not.toHaveBeenCalled();
  });

  it('never pings twice for the same message', () => {
    const ping = loadWith({ createAudioPlayer });
    ping('m1');
    ping('m1');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('does nothing, and does not throw, when the native audio module is missing', () => {
    const ping = loadWith({
      createAudioPlayer: () => {
        throw new Error('Cannot find native module ExpoAudio');
      },
    });
    expect(() => ping('m1')).not.toThrow();
    expect(play).not.toHaveBeenCalled();
  });
});

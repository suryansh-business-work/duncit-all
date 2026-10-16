import { describe, expect, it } from 'vitest';
import { canOpenPodChat, podChatPath } from '../src/pod-chat';

describe('canOpenPodChat', () => {
  it('lets the pod’s host in, even with no booking of their own', () => {
    expect(canOpenPodChat({ viewerId: 'u1', hostIds: ['u1'], attendeeIds: [], isMember: false })).toBe(
      true,
    );
  });

  it('lets an attendee in', () => {
    expect(canOpenPodChat({ viewerId: 'u2', hostIds: ['u1'], attendeeIds: ['u3', 'u2'] })).toBe(true);
  });

  it('lets a viewer whose booking is JOINED in, before the attendee list catches up', () => {
    expect(canOpenPodChat({ viewerId: 'u4', hostIds: ['u1'], attendeeIds: [], isMember: true })).toBe(
      true,
    );
  });

  it('keeps out a signed-in viewer who neither hosts, attends nor has joined', () => {
    expect(
      canOpenPodChat({ viewerId: 'u9', hostIds: ['u1'], attendeeIds: ['u2'], isMember: false }),
    ).toBe(false);
  });

  it('keeps out a signed-out viewer, whatever the lists or a stale member flag say', () => {
    expect(canOpenPodChat({ viewerId: null, hostIds: ['u1'], attendeeIds: ['u2'], isMember: true })).toBe(
      false,
    );
    expect(canOpenPodChat({ viewerId: '', hostIds: [''], attendeeIds: [''] })).toBe(false);
  });

  it('treats missing host and attendee lists as empty rather than failing', () => {
    expect(canOpenPodChat({ viewerId: 'u1', hostIds: null, attendeeIds: undefined })).toBe(false);
    expect(canOpenPodChat({ viewerId: 'u1' })).toBe(false);
  });
});

describe('podChatPath', () => {
  it('points at the pod room by the pod’s document id', () => {
    expect(podChatPath('6650f0c2a1b2c3d4e5f60718')).toBe('/chats/6650f0c2a1b2c3d4e5f60718');
  });
});

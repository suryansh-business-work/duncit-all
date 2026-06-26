import { buildTypingPayload } from '../../supportChat.typing';

describe('support_typing payload (B14a)', () => {
  it('labels a support-role socket as AGENT', () => {
    const p = buildTypingPayload({
      sessionId: 's1',
      userId: 'u1',
      roles: ['SUPPORT_MANAGER'],
      name: 'Asha',
    });
    expect(p).toEqual({ session_id: 's1', user_id: 'u1', role: 'AGENT', name: 'Asha' });
  });

  it('labels a non-support socket as USER and defaults name to null', () => {
    const p = buildTypingPayload({ sessionId: 's2', userId: 'u2', roles: ['USER'] });
    expect(p).toEqual({ session_id: 's2', user_id: 'u2', role: 'USER', name: null });
  });

  it('treats missing roles as a USER', () => {
    const p = buildTypingPayload({ sessionId: 's3', userId: 'u3' });
    expect(p.role).toBe('USER');
    expect(p.name).toBeNull();
  });

  it('recognises SUPER_ADMIN and SUPPORT_USER as agents', () => {
    expect(buildTypingPayload({ sessionId: 's', userId: 'u', roles: ['SUPER_ADMIN'] }).role).toBe('AGENT');
    expect(buildTypingPayload({ sessionId: 's', userId: 'u', roles: ['SUPPORT_USER'] }).role).toBe('AGENT');
  });
});

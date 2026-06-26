import { typingLabel } from '@/utils/support-typing';

describe('typingLabel (B14a)', () => {
  it('returns nothing when nobody is typing', () => {
    expect(typingLabel(null)).toBe('');
  });

  it('labels an AGENT as Support regardless of name', () => {
    expect(typingLabel({ role: 'AGENT', name: 'Asha' })).toBe('Support is typing…');
  });

  it('uses the carried display name for a non-agent', () => {
    expect(typingLabel({ role: 'USER', name: 'Ravi' })).toBe('Ravi is typing…');
  });

  it('falls back to "Someone" when no name is carried', () => {
    expect(typingLabel({ role: 'USER', name: null })).toBe('Someone is typing…');
    expect(typingLabel({ name: '   ' })).toBe('Someone is typing…');
  });
});

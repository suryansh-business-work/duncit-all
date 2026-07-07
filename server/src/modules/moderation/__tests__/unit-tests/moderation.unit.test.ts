import { moderateText } from '@modules/moderation/moderation.rules';
import { moderationService } from '@modules/moderation/moderation.service';

describe('moderateText', () => {
  it('flags an email address', () => {
    expect(moderateText('pod_description', 'reach me at foo@bar.com').some((v) => v.type === 'EMAIL')).toBe(true);
  });

  it('flags a phone number in its common forms', () => {
    expect(moderateText('pod_title', 'call 9876543210 to join').some((v) => v.type === 'PHONE')).toBe(true);
    expect(moderateText('pod_title', 'call 09876543210 now').some((v) => v.type === 'PHONE')).toBe(true);
    expect(moderateText('pod_desc', 'reach +91 98765 43210').some((v) => v.type === 'PHONE')).toBe(true);
  });

  it('does not flag prices, timestamps or number lists as phones', () => {
    expect(moderateText('pod_title', 'entry is 500 rupees')).toEqual([]);
    expect(moderateText('pod_title', 'Batch timings 10 11 12 1 2 3 4 5')).toEqual([]);
    expect(moderateText('pod_title', 'Sunday jam 1783405988989')).toEqual([]);
  });

  it('flags external, shop and modern (.ai/.tech) links', () => {
    expect(moderateText('pod_info', 'join at https://evil.example/x').some((v) => v.type === 'LINK')).toBe(true);
    expect(moderateText('pod_info', 'visit mysite.shop today').some((v) => v.type === 'LINK')).toBe(true);
    expect(moderateText('pod_info', 'see cooltool.ai now').some((v) => v.type === 'LINK')).toBe(true);
  });

  it('does not flag common-word glued periods (fill.in, join.me) as links', () => {
    expect(moderateText('pod_description', 'please fill.in the form')).toEqual([]);
    expect(moderateText('pod_description', 'we meet at join.me spot')).toEqual([]);
  });

  it('does not double-flag an email domain as a link', () => {
    const v = moderateText('pod_description', 'contact foo@bar.com');
    expect(v.filter((x) => x.type === 'LINK')).toHaveLength(0);
    expect(v.some((x) => x.type === 'EMAIL')).toBe(true);
  });

  it('flags payment handles and off-platform contact', () => {
    expect(moderateText('pod_description', 'pay me on paytm').some((v) => v.type === 'PAYMENT')).toBe(true);
    expect(moderateText('pod_description', 'whatsapp me for details').some((v) => v.type === 'CONTACT')).toBe(true);
  });

  it('flags abusive and adult wording', () => {
    expect(moderateText('pod_title', 'you bitch').some((v) => v.type === 'ABUSE')).toBe(true);
    expect(moderateText('pod_title', 'free nudes tonight').some((v) => v.type === 'NUDITY')).toBe(true);
  });

  it('passes clean text and empty input', () => {
    expect(moderateText('pod_title', 'Sunday morning chess meetup')).toEqual([]);
    expect(moderateText('pod_title', '')).toEqual([]);
    expect(moderateText('pod_title', '   ')).toEqual([]);
  });

  it('tags every deterministic violation with step REGEX', () => {
    const v = moderateText('pod_title', 'mail a@b.com');
    expect(v.every((x) => x.step === 'REGEX')).toBe(true);
  });
});

describe('moderationService.assertCleanOrThrow', () => {
  it('throws POD_CONTENT_REJECTED with violations on bad content', () => {
    try {
      moderationService.assertCleanOrThrow({ pod_title: 'x', pod_description: 'mail a@b.com' });
      throw new Error('should have thrown');
    } catch (err: any) {
      expect(err.extensions?.code).toBe('POD_CONTENT_REJECTED');
      expect(Array.isArray(err.extensions?.violations)).toBe(true);
      expect(err.extensions.violations.length).toBeGreaterThan(0);
    }
  });

  it('passes clean content', () => {
    expect(() =>
      moderationService.assertCleanOrThrow({ pod_title: 'Chess night', pod_description: 'Fun evening' })
    ).not.toThrow();
  });

  it('scans hashtags and pod_info too', () => {
    expect(() =>
      moderationService.assertCleanOrThrow({
        pod_title: 'ok',
        pod_description: 'ok',
        pod_info: 'ok',
        pod_hashtag: ['paytm'],
      })
    ).toThrow();
  });
});

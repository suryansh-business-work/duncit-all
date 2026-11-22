import { cleanSource, deviceOf, hostOf, isPromptEventType } from '../../prompt.analytics';

describe('prompt analytics helpers', () => {
  it('sorts a user agent into bot, tablet, mobile, desktop or unknown', () => {
    expect(deviceOf('Googlebot/2.1')).toBe('bot');
    expect(deviceOf('Slackbot-LinkExpanding 1.0')).toBe('bot');
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14) Mobile')).toBe('mobile');
    expect(deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('desktop');
    expect(deviceOf('')).toBe('unknown');
    expect(deviceOf(null)).toBe('unknown');
  });

  it('keeps only the referrer host, and nothing from a value that is not a URL', () => {
    expect(hostOf('https://News.YCombinator.com/item?id=1&token=abc')).toBe('news.ycombinator.com');
    expect(hostOf('not a url')).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });

  it('reduces a campaign name to safe characters, or nothing', () => {
    expect(cleanSource('Twitter_Ads-2026.Q4')).toBe('twitter_ads-2026.q4');
    expect(cleanSource('<img onerror=x>')).toBe('imgonerrorx');
    expect(cleanSource('###')).toBeNull();
    expect(cleanSource('a'.repeat(100))).toHaveLength(60);
  });

  it('knows the event types', () => {
    expect(isPromptEventType('COPY_SCRIPT')).toBe(true);
    expect(isPromptEventType('copy_script')).toBe(false);
    expect(isPromptEventType(7)).toBe(false);
  });
});

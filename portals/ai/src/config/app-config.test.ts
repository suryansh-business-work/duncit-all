import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit AI app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('ai');
    expect(appConfig.name).toBe('AI');
    expect(appConfig.fullName).toBe('Duncit AI');
    expect(appConfig.tokenKey).toBe('ai_token');
  });

  it('gates on the AI_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('AI_MANAGER');
  });

  it('exposes a Welcome nav entry', () => {
    expect(appConfig.nav.some((n) => n.to === '/')).toBe(true);
  });
});

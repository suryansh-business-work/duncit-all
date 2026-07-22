import { describe, expect, it } from 'vitest';
import { telemetrySettingsSchema } from '../../src/pages/telemetry-logs-settings/schema';

const base = {
  signoz_enabled: true,
  persisted_levels: ['error', 'warn'],
  retention_days: 30,
};

const firstError = (result: ReturnType<typeof telemetrySettingsSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('telemetrySettingsSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = telemetrySettingsSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects an empty persisted_levels list', () => {
    expect(firstError(telemetrySettingsSchema.safeParse({ ...base, persisted_levels: [] }))).toMatch(
      /at least one level/i,
    );
  });

  it('rejects a retention below 1 day', () => {
    expect(firstError(telemetrySettingsSchema.safeParse({ ...base, retention_days: 0 }))).toMatch(
      /at least 1 day/i,
    );
  });

  it('rejects a retention above 90 days', () => {
    expect(firstError(telemetrySettingsSchema.safeParse({ ...base, retention_days: 91 }))).toMatch(
      /at most 90 days/i,
    );
  });

  it('rejects a non-integer retention', () => {
    expect(firstError(telemetrySettingsSchema.safeParse({ ...base, retention_days: 3.5 }))).toMatch(
      /whole days/i,
    );
  });

  it('coerces a numeric string retention', () => {
    const result = telemetrySettingsSchema.safeParse({ ...base, retention_days: '45' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.retention_days).toBe(45);
  });
});

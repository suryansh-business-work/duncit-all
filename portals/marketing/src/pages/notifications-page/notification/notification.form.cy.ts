import { describe, expect, it } from 'vitest';
import { notificationFormSchema, toCreateNotificationInput } from './notification.form';

const base = {
  title: 'Welcome',
  body: 'Hello world from Duncit',
  image_url: '',
  link_url: '',
  scope: 'GLOBAL' as const,
  silent: false,
  location_id: '',
  zone_name: '',
  target_user_ids: [] as string[],
};

const messages = (result: ReturnType<typeof notificationFormSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('notificationFormSchema', () => {
  it('rejects title shorter than 3 chars', () => {
    const result = notificationFormSchema.safeParse({ ...base, title: 'Hi' });
    expect(messages(result)).toMatch(/title/i);
  });

  it('rejects body shorter than 5 chars', () => {
    const result = notificationFormSchema.safeParse({ ...base, body: 'Hi' });
    expect(messages(result)).toMatch(/body/i);
  });

  it('requires location for LOCATION scope', () => {
    const result = notificationFormSchema.safeParse({ ...base, scope: 'LOCATION' as const });
    expect(messages(result)).toMatch(/location/i);
  });

  it('requires zone for ZONE scope', () => {
    const result = notificationFormSchema.safeParse({ ...base, scope: 'ZONE' as const, location_id: 'l1' });
    expect(messages(result)).toMatch(/zone/i);
  });

  it('requires at least one user for USER scope', () => {
    const result = notificationFormSchema.safeParse({ ...base, scope: 'USER' as const });
    expect(messages(result)).toMatch(/user/i);
  });

  it('rejects image_url with non-http protocol', () => {
    const result = notificationFormSchema.safeParse({ ...base, image_url: 'javascript:alert(1)' });
    expect(messages(result)).toMatch(/image url/i);
  });

  it('accepts a valid GLOBAL notification', () => {
    const parsed = notificationFormSchema.parse(base);
    expect(parsed.scope).toBe('GLOBAL');
  });
});

describe('toCreateNotificationInput', () => {
  it('nullifies location_id when scope is GLOBAL', () => {
    const input = toCreateNotificationInput({ ...base, location_id: 'leftover' });
    expect(input.location_id).toBeNull();
  });

  it('passes target_user_ids only for USER scope', () => {
    const input = toCreateNotificationInput({
      ...base,
      scope: 'USER',
      target_user_ids: ['u1', 'u2'],
    });
    expect(input.target_user_ids).toEqual(['u1', 'u2']);
  });
});

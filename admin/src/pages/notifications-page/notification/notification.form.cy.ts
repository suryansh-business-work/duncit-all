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

describe('notificationFormSchema', () => {
  it('rejects title shorter than 3 chars', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, title: 'Hi' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });

  it('rejects body shorter than 5 chars', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, body: 'Hi' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/body/i);
  });

  it('requires location for LOCATION scope', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, scope: 'LOCATION' as const }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/location/i);
  });

  it('requires zone for ZONE scope', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, scope: 'ZONE' as const, location_id: 'l1' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/zone/i);
  });

  it('requires at least one user for USER scope', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, scope: 'USER' as const }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/user/i);
  });

  it('rejects image_url with non-http protocol', async () => {
    const error = await notificationFormSchema
      .validate({ ...base, image_url: 'javascript:alert(1)' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/image url/i);
  });

  it('accepts a valid GLOBAL notification', async () => {
    const parsed = await notificationFormSchema.validate(base, { abortEarly: false });
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

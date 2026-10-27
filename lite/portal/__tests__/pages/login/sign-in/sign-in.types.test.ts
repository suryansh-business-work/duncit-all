import { describe, expect, it } from 'vitest';
import { makeCodeSchema, makeEmailSchema } from '../../../../pages/login/sign-in';
import { portalT } from '../../../test-utils';

describe('makeEmailSchema', () => {
  const schema = makeEmailSchema(portalT);

  it('trims and lowercases the address', () => {
    expect(schema.parse({ email: '  Asha@Lite.Example ' })).toEqual({ email: 'asha@lite.example' });
  });

  it('asks for an address first, then a valid one', () => {
    expect(schema.safeParse({ email: '' }).error?.issues[0]?.message).toBe('Email is required');
    expect(schema.safeParse({ email: 'asha@lite' }).error?.issues[0]?.message).toBe('Enter a valid email address');
  });
});

describe('makeCodeSchema', () => {
  const schema = makeCodeSchema(portalT);

  it('takes exactly six digits, trimmed', () => {
    expect(schema.parse({ code: ' 042917 ' })).toEqual({ code: '042917' });
  });

  it('refuses anything else with the code message', () => {
    for (const code of ['', '12345', '1234567', '12 456', 'abcdef', '１２３４５６']) {
      expect(schema.safeParse({ code }).error?.issues[0]?.message, code).toBe('Enter the 6-digit code from your email');
    }
  });
});

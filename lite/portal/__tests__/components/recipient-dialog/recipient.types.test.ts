import { describe, expect, it } from 'vitest';
import { makeRecipientSchema } from '../../../components/recipient-dialog';
import { portalT } from '../../test-utils';

const schema = makeRecipientSchema(portalT);

describe('makeRecipientSchema', () => {
  it('trims and lowercases a valid address', () => {
    expect(schema.parse({ to: '  Asha@Lite.Example ' })).toEqual({ to: 'asha@lite.example' });
  });

  it('asks for the address first when the box is blank or only spaces', () => {
    for (const to of ['', '    ']) {
      const result = schema.safeParse({ to });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Send to is required');
    }
  });

  it('refuses something that is not an email address', () => {
    for (const to of ['asha', 'asha@', 'asha@lite', 'a b@lite.example']) {
      const result = schema.safeParse({ to });
      expect(result.success, to).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Enter a valid email address');
    }
  });
});

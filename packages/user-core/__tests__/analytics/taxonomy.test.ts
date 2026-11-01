import { describe, expect, it } from 'vitest';
import { deviceTypeForWidth } from '../../src/analytics/taxonomy';

describe('deviceTypeForWidth', () => {
  it('splits at 768 and 1024 pixels', () => {
    expect(deviceTypeForWidth(390)).toBe('phone');
    expect(deviceTypeForWidth(767)).toBe('phone');
    expect(deviceTypeForWidth(768)).toBe('tablet');
    expect(deviceTypeForWidth(1023)).toBe('tablet');
    expect(deviceTypeForWidth(1024)).toBe('desktop');
  });
});

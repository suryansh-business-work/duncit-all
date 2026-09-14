import { describe, expect, it } from 'vitest';
import {
  E2E_ONE_TIME_CODE_QUERY,
  E2E_PURGE_MUTATION,
  E2E_TRAFFIC_HEADER,
  E2E_TRAFFIC_KEY_QUERY,
  runAddress,
  runPassword,
} from '../src/e2e-run';

const ACCOUNT = 'admin+140920260300@duncit.com';

describe('runPassword', () => {
  // Each spec file is its own process; the stages are the only memory between them.
  it('keeps the saved password at signup', () => {
    expect(runPassword('Duncit@2026', 'SIGNUP')).toBe('Duncit@2026');
  });

  it('gives recovery and change their own, different passwords', () => {
    const recovered = runPassword('Duncit@2026', 'RECOVERED');
    const changed = runPassword('Duncit@2026', 'CHANGED');
    expect(recovered).toBe('Duncit@2026-R1');
    expect(changed).toBe('Duncit@2026-C2');
    expect(new Set(['Duncit@2026', recovered, changed]).size).toBe(3);
  });
});

describe('runAddress', () => {
  it('suffixes the local part and keeps the stamp and domain', () => {
    expect(runAddress(ACCOUNT, 'new')).toBe('admin+140920260300-new@duncit.com');
  });

  it('suffixes at the last @', () => {
    expect(runAddress('odd@local@duncit.com', 'dup')).toBe('odd@local-dup@duncit.com');
  });
});

describe('the server contract', () => {
  it('names the header the rate limiter verifies', () => {
    expect(E2E_TRAFFIC_HEADER).toBe('x-duncit-e2e');
  });

  it('asks for a held code by purpose and email or phone', () => {
    expect(E2E_ONE_TIME_CODE_QUERY).toContain('e2eOneTimeCode(purpose: $purpose, email: $email, phone: $phone)');
    expect(E2E_ONE_TIME_CODE_QUERY).toContain('code purpose issued_at expires_at');
  });

  it('asks the server under test for the traffic key and purges by run account', () => {
    expect(E2E_TRAFFIC_KEY_QUERY).toContain('e2eTrafficKey(stamp: $stamp)');
    expect(E2E_PURGE_MUTATION).toContain('purgeE2eRunData(input: $input)');
  });
});

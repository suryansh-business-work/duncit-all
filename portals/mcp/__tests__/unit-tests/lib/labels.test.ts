import { describe, expect, it } from 'vitest';
import { fallbackT } from '@duncit/shell';
import {
  accessLabel,
  CALL_STATUS,
  CONNECTION_STATUS,
  GUARD_MODES,
  guardModeLabel,
  SCOPE_WRITE,
  TOOL_KIND,
  TOOL_RISK,
  vocabularyColors,
  vocabularyLabel,
  vocabularyOptions,
} from '../../../src/lib/labels';

/** Names the key it was asked for, so a test can see which copy a value maps to. */
const keyT = (key: string) => `<${key}>`;

describe('MCP vocabularies', () => {
  it('cover every value the server sends', () => {
    expect(Object.keys(CALL_STATUS)).toEqual(['OK', 'ERROR', 'DENIED', 'BLOCKED', 'INVALID']);
    expect(Object.keys(TOOL_RISK)).toEqual(['READ', 'WRITE', 'DESTRUCTIVE']);
    expect(Object.keys(TOOL_KIND)).toEqual(['QUERY', 'MUTATION', 'CURATED']);
    expect(Object.keys(CONNECTION_STATUS)).toEqual(['ACTIVE', 'REVOKED', 'EXPIRED']);
    expect(GUARD_MODES).toEqual(['block', 'warn']);
    expect(SCOPE_WRITE).toBe('mcp:write');
  });

  it('render each value through its own copy key, in the reader’s language', () => {
    expect(vocabularyLabel(CALL_STATUS, 'BLOCKED', keyT)).toBe('<mcp.status.blocked>');
    expect(vocabularyLabel(CALL_STATUS, 'OK', fallbackT)).toBe('OK');
    expect(vocabularyLabel(TOOL_RISK, 'DESTRUCTIVE', fallbackT)).toBe('Destructive');
    expect(vocabularyLabel(TOOL_KIND, 'CURATED', fallbackT)).toBe('Built-in');
    expect(vocabularyLabel(CONNECTION_STATUS, 'EXPIRED', fallbackT)).toBe('Expired');
  });

  it('show a value the console does not know yet as it came, never a blank', () => {
    expect(vocabularyLabel(CALL_STATUS, 'THROTTLED', keyT)).toBe('THROTTLED');
  });

  it('colour failures as errors, refusals as warnings and success as success', () => {
    expect(vocabularyColors(CALL_STATUS)).toEqual({
      OK: 'success',
      ERROR: 'error',
      DENIED: 'warning',
      BLOCKED: 'warning',
      INVALID: 'error',
    });
    expect(vocabularyColors(TOOL_RISK).DESTRUCTIVE).toBe('error');
    expect(vocabularyColors(CONNECTION_STATUS).ACTIVE).toBe('success');
  });

  it('turn a vocabulary into the options of an enum column, in order', () => {
    expect(vocabularyOptions(TOOL_RISK, fallbackT)).toEqual([
      { value: 'READ', label: 'Read' },
      { value: 'WRITE', label: 'Write' },
      { value: 'DESTRUCTIVE', label: 'Destructive' },
    ]);
  });
});

describe('guardModeLabel', () => {
  it('names both guard modes', () => {
    expect(guardModeLabel('block', fallbackT)).toBe('Block');
    expect(guardModeLabel('warn', fallbackT)).toBe('Warn');
  });

  it('shows an unknown mode as it came', () => {
    expect(guardModeLabel('audit', keyT)).toBe('audit');
  });
});

describe('accessLabel', () => {
  it('reads a connection holding the write scope as read & write', () => {
    expect(accessLabel(['mcp:read', 'mcp:write'], fallbackT)).toBe('Read & write');
  });

  it('reads any other connection as read only', () => {
    expect(accessLabel(['mcp:read'], fallbackT)).toBe('Read only');
    expect(accessLabel([], fallbackT)).toBe('Read only');
  });
});

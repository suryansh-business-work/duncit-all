/**
 * Whether a tool matches a search term: name, description and its keywords,
 * so a search finds what a person means rather than only what a tool is
 * literally called.
 */
import { describe, expect, it } from 'vitest';

import { matchesTool } from '../src/chrome/AppsDrawer/tools';
import type { ShellTool } from '../src/chrome/AppsDrawer/tools';

const TOOL: ShellTool = {
  key: 'x',
  name: 'Rota',
  description: 'Who is on shift',
  icon: null,
};

describe('matchesTool', () => {
  it('matches everything with an empty search term', () => {
    expect(matchesTool(TOOL, '')).toBe(true);
    expect(matchesTool(TOOL, '   ')).toBe(true);
  });

  it('matches by name or description for a tool with no keywords of its own', () => {
    expect(matchesTool(TOOL, 'rota')).toBe(true);
    expect(matchesTool(TOOL, 'shift')).toBe(true);
    expect(matchesTool(TOOL, 'payroll')).toBe(false);
  });

  it('also matches by a keyword when the tool carries some', () => {
    const withKeywords: ShellTool = { ...TOOL, keywords: ['schedule', 'roster'] };
    expect(matchesTool(withKeywords, 'roster')).toBe(true);
  });
});

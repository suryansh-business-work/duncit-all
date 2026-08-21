import { describe, expect, it } from 'vitest';

import type { ParsedIssue } from '../src/parse';
import {
  ISSUE_LOG_COMPONENT,
  ISSUE_REPORT_CATEGORY,
  buildIssueReportMessage,
  issueLogData,
  issueLogLevel,
} from '../src/report';

const issue = (over: Partial<ParsedIssue> = {}): ParsedIssue => ({
  kind: 'SERVER',
  code: null,
  message: 'Something broke.',
  operation: null,
  path: null,
  offerReport: true,
  ...over,
});

describe('the markers the Tech portal filters on', () => {
  it('names the component and the feedback category the pipeline already knows', () => {
    expect(ISSUE_LOG_COMPONENT).toBe('serverIssue');
    expect(ISSUE_REPORT_CATEGORY).toBe('BUG');
  });
});

describe('issueLogLevel', () => {
  it.each(['VALIDATION', 'AUTH', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'] as const)(
    'logs %s as a warn — the server answered correctly, so no bug should be filed',
    (kind) => {
      expect(issueLogLevel(issue({ kind }))).toBe('warn');
    }
  );

  it.each(['SERVER', 'NETWORK', 'UNKNOWN'] as const)('logs %s as an error', (kind) => {
    expect(issueLogLevel(issue({ kind }))).toBe('error');
  });
});

describe('issueLogData', () => {
  it('always carries the kind', () => {
    expect(issueLogData(issue({ kind: 'NETWORK' }))).toEqual({ kind: 'NETWORK' });
  });

  it('adds every optional key that is present, under the names Error Logs renders', () => {
    expect(
      issueLogData(issue({ kind: 'CONFLICT', code: 'ALREADY_BOOKED', operation: 'JoinPod', path: 'joinPod.ticket' }))
    ).toEqual({
      kind: 'CONFLICT',
      code: 'ALREADY_BOOKED',
      operation: 'JoinPod',
      gql_path: 'joinPod.ticket',
    });
  });
});

describe('buildIssueReportMessage', () => {
  const context = { surface: 'mweb', page: '/pod/checkout' };

  it('leads with where it happened and keeps the lines a person reads', () => {
    expect(buildIssueReportMessage(issue(), context)).toBe(
      ['Server operation failed on mweb · /pod/checkout', 'Message: Something broke.', 'Kind: SERVER'].join('\n')
    );
  });

  it('appends the code, operation and path when the parser found them', () => {
    const message = buildIssueReportMessage(
      issue({ code: 'CONFIG_ERROR', operation: 'PayForPod', path: 'payForPod' }),
      context
    );

    expect(message.split('\n').slice(3)).toEqual([
      'Code: CONFIG_ERROR',
      'Operation: PayForPod',
      'Path: payForPod',
    ]);
  });
});

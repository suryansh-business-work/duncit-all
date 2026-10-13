import { describe, expect, it } from 'vitest';
import { parseIssueData, type ErrorLogRow } from '../../src/pages/error-logs-page/queries';

const row = (data_json: string | null) => ({ data_json }) as unknown as ErrorLogRow;

describe('parseIssueData', () => {
  it('reads the issue fields out of the log data blob', () => {
    expect(
      parseIssueData(row('{"kind":"GRAPHQL","code":"FORBIDDEN","operation":"Pods","gql_path":"pods.list"}')),
    ).toEqual({ kind: 'GRAPHQL', code: 'FORBIDDEN', operation: 'Pods', gql_path: 'pods.list' });
  });

  it('returns an empty object when the log carries no data', () => {
    expect(parseIssueData(row(null))).toEqual({});
    expect(parseIssueData(row(''))).toEqual({});
  });

  it('returns an empty object rather than throwing on a malformed blob', () => {
    expect(parseIssueData(row('{not json'))).toEqual({});
  });
});

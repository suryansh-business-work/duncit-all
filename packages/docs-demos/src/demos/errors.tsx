import { buildIssueReportMessage, issueLogLevel, parseIssue } from '@duncit/errors';
import { defineDemo, defineDemos } from '../types';

/** An Apollo error exactly as a mutation rejects with it. */
interface ApiErrorMock {
  graphQLErrors: {
    message: string;
    path?: string[];
    extensions?: { code?: string };
  }[];
  operation: string;
  surface: string;
  page: string;
}

export default defineDemos('errors', [
  defineDemo<ApiErrorMock>({
    id: 'parse',
    title: 'One shape for every way the API can fail',
    note:
      "Change extensions.code to NETWORK_ERROR, or empty graphQLErrors entirely — the kind, the message a user sees and the log level all move with it.",
    mock: {
      graphQLErrors: [
        {
          message: 'This pod is full — the last seat went while you were checking out.',
          path: ['joinPod'],
          extensions: { code: 'CHECKOUT_NOT_ELIGIBLE' },
        },
      ],
      operation: 'JoinPod',
      surface: 'mweb',
      page: '/pod/DUN-POD-4821/checkout',
    },
    compute: (mock) => {
      const issue = parseIssue(mock, { operation: mock.operation });
      return {
        'Kind': issue.kind,
        'Code': issue.code,
        'Message shown to the user': issue.message,
        'Failing field path': issue.path,
        'Log level': issueLogLevel(issue),
        'What Report a problem sends': buildIssueReportMessage(issue, {
          surface: mock.surface,
          page: mock.page,
        }),
      };
    },
  }),
]);

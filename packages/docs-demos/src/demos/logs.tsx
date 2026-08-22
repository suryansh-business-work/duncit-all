import { detectEnvironment, serializeError } from '@duncit/logs';
import { defineDemo, defineDemos } from '../types';

interface LogMock {
  /** Where the surface is running — the URL the logger reads. */
  url: string;
  page: string;
  component: string;
  error_message: string;
}

export default defineDemos('logs', [
  defineDemo<LogMock>({
    id: 'structured',
    title: 'What a log line carries before anyone adds a field',
    note:
      "Change url to https://staging.admin.duncit.com and the environment moves with it — nothing in a call site names its own environment, which is how a staging error stopped being filed under production.",
    mock: {
      url: 'https://admin.duncit.com/categories',
      page: 'CategoriesPage',
      component: 'CategoryFormDialog',
      error_message: 'A sibling with that name already exists',
    },
    compute: (mock) => ({
      'detectEnvironment(url)': detectEnvironment(mock.url),
      'serializeError(new Error(...))': serializeError(new Error(mock.error_message)),
      'serializeError of a thrown string': serializeError(mock.error_message),
      'serializeError(null)': serializeError(null),
      'The call a page actually writes': `logs.admin.error('${mock.page}', '${mock.component}', { error })`,
    }),
  }),
]);

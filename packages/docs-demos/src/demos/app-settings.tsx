import { pageTitle } from '@duncit/app-settings';
import { defineDemo, defineDemos } from '../types';

interface TitleMock {
  app_name: string;
  page_titles: string[];
}

export default defineDemos('app-settings', [
  defineDemo<TitleMock>({
    id: 'page-title',
    title: 'What the browser tab says on every page',
    note:
      "Set a page title equal to app_name and it is NOT repeated — 'Duncit Tech | Duncit Tech' is the bug this one rule exists to stop.",
    mock: {
      app_name: 'Duncit Tech',
      page_titles: ['Package Documentation', 'Telemetry Logs', 'Duncit Tech', 'Email Templates'],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.page_titles.map((title) => [title, pageTitle(title, mock.app_name)])
      ),
  }),
]);

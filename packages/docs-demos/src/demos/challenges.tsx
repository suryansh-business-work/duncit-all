import { parseToolFields, toolConfigIssues, withDefaults, type ToolConfig } from '@duncit/challenges';
import { defineDemo, defineDemos } from '../types';

interface ConfigMock {
  config_schema_json: string;
  config: ToolConfig;
}

/** The field list the server publishes for the Score Counter tool. */
const SCORE_COUNTER_FIELDS = JSON.stringify([
  { key: 'unit', kind: 'text', default: 'points' },
  { key: 'increments', kind: 'number_list', default: [1, 2, 3] },
  { key: 'allow_negative', kind: 'boolean', default: false },
  { key: 'max_value', kind: 'number', default: 0, min: 0 },
  { key: 'counts_toward_total', kind: 'boolean', default: true },
  { key: 'weight', kind: 'number', default: 1, min: -100, max: 100 },
]);

export default defineDemos('challenges', [
  defineDemo<ConfigMock>({
    id: 'tool-config',
    title: 'One Score Counter, configured for cricket',
    note:
      'The same universal tool serves every sport — only its settings differ. Edit the config: a zero in the score buttons, or a weight beyond ±100, is caught here exactly as the server would refuse it.',
    mock: {
      config_schema_json: SCORE_COUNTER_FIELDS,
      config: { unit: 'runs', increments: [1, 2, 4, 6], weight: 1 },
    },
    compute: (mock) => {
      const fields = parseToolFields(mock.config_schema_json);
      const complete = withDefaults(fields, mock.config);
      return {
        'Settings after defaults': complete,
        'Problems the server would refuse': toolConfigIssues(fields, complete),
      };
    },
  }),
]);

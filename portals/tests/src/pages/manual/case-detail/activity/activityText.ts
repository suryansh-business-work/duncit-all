import type { Translate } from '@duncit/shell';
import { ENVIRONMENT_KEYS, FIELD_KEYS, PRIORITY_KEYS, TYPE_KEYS } from '../../shared/vocabulary';
import type { ManualActivity } from '../../shared/types';

/** Stored enum values the Activity tab says in words. */
const VALUE_KEYS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  type: TYPE_KEYS,
  priority: PRIORITY_KEYS,
  environment: ENVIRONMENT_KEYS,
};

/** Fields whose change is shown without values: long rich text and step lists. */
const CONTENT_FIELDS = new Set(['description', 'preconditions', 'expected_result', 'actual_result', 'steps']);

interface Formatters {
  formatDate: (input: string) => string;
}

/** One logged value as a person reads it. */
function valueText(t: Translate, field: string, value: string, format: Formatters): string {
  if (!value) return t('testsManual.activity.none');
  const key = VALUE_KEYS[field]?.[value];
  if (key) return t(key);
  if (field === 'due_date') return format.formatDate(value);
  return value;
}

/** What one Activity entry says: who changed what, and the from → to line when it has one. */
export function activityText(t: Translate, entry: ManualActivity, name: string, format: Formatters) {
  if (entry.action === 'CREATE') return { headline: t('testsManual.activity.created', { vars: { name } }), detail: '' };
  const fieldKey = FIELD_KEYS[entry.field];
  const field = fieldKey ? t(fieldKey) : entry.field;
  const headline = t('testsManual.activity.changed', { vars: { name, field } });
  if (CONTENT_FIELDS.has(entry.field)) return { headline, detail: '' };
  return {
    headline,
    detail: t('testsManual.activity.fromTo', {
      vars: {
        from: valueText(t, entry.field, entry.old_value, format),
        to: valueText(t, entry.field, entry.new_value, format),
      },
    }),
  };
}

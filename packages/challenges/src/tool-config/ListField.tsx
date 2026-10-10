import { useTranslation } from '../i18n';
import { ListEditor, type ListColumn, type ListRow } from './ListEditor';
import type { ToolField } from './fields';

interface Props {
  field: ToolField;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  disabled?: boolean;
}

interface Question {
  key: string;
  label: string;
  options: string[];
  correct: number;
  points: number;
}

/** A short unique key for a new row (the server keeps the keys it is given). */
const newKey = (prefix: string) => `${prefix}${Date.now().toString(36)}`;

const asRows = (value: unknown): ListRow[] => (Array.isArray(value) ? (value as ListRow[]) : []);

/**
 * The editor for a list-valued tool setting, chosen by the field's kind:
 * tasks/checkpoints (label + points), poll options (label), quiz questions
 * (question, answers, which is correct, points) and formula terms (tool +
 * weight). Questions are edited as "answers, comma-separated" plus the
 * correct answer's position, and stored as the server expects.
 */
export function ListField({ field, value, onChange, error, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t(`challenge.toolConfig.fields.${field.key}`);
  const labelColumn: ListColumn = { key: 'label', label: t('challenge.toolConfig.list.label'), kind: 'text', flex: 3 };
  const pointsColumn: ListColumn = { key: 'points', label: t('challenge.toolConfig.list.points'), kind: 'number' };

  if (field.kind === 'questions') {
    const rows: ListRow[] = (Array.isArray(value) ? (value as Question[]) : []).map((q) => ({
      key: q.key,
      label: q.label,
      answers: (q.options ?? []).join(', '),
      correct: (q.correct ?? 0) + 1,
      points: q.points ?? 1,
    }));
    const toQuestions = (next: ListRow[]): Question[] =>
      next.map((row) => ({
        key: String(row.key),
        label: String(row.label ?? ''),
        options: String(row.answers ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        correct: Math.max(0, Number(row.correct ?? 1) - 1),
        points: Number(row.points ?? 1),
      }));
    return (
      <ListEditor
        title={title}
        rows={rows}
        columns={[
          { key: 'label', label: t('challenge.toolConfig.list.question'), kind: 'text', flex: 3 },
          { key: 'answers', label: t('challenge.toolConfig.list.answers'), kind: 'text', flex: 3 },
          { key: 'correct', label: t('challenge.toolConfig.list.correct'), kind: 'number' },
          pointsColumn,
        ]}
        onChange={(next) => onChange(toQuestions(next))}
        newRow={() => ({ key: newKey('q'), label: '', answers: '', correct: 1, points: 1 })}
        hint={t('challenge.toolConfig.list.questionHint')}
        error={error}
        disabled={disabled}
      />
    );
  }
  if (field.kind === 'weights') {
    const options = (field.options ?? []).map((type) => ({ value: type, label: t(`challenge.toolConfig.toolTypes.${type}`) }));
    return (
      <ListEditor
        title={title}
        rows={asRows(value).map((row, i) => ({ ...row, key: `${String(row.type)}-${i}` }))}
        columns={[
          { key: 'type', label: t('challenge.toolConfig.list.tool'), kind: 'select', options, flex: 3 },
          { key: 'weight', label: t('challenge.toolConfig.list.weight'), kind: 'number' },
        ]}
        onChange={(next) => onChange(next.map((row) => ({ type: String(row.type), weight: Number(row.weight) })))}
        newRow={() => ({ key: newKey('w'), type: field.options?.[0] ?? '', weight: 1 })}
        hint={t('challenge.toolConfig.list.formulaHint')}
        error={error}
        disabled={disabled}
      />
    );
  }
  const isOptions = field.kind === 'options';
  return (
    <ListEditor
      title={title}
      rows={asRows(value)}
      columns={isOptions ? [labelColumn] : [labelColumn, pointsColumn]}
      onChange={onChange}
      newRow={(): ListRow => (isOptions ? { key: newKey('o'), label: '' } : { key: newKey('i'), label: '', points: 1 })}
      min={isOptions ? 2 : 1}
      error={error}
      disabled={disabled}
    />
  );
}

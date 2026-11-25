import { useWatch, type Control } from 'react-hook-form';

import { Card } from '@/components/Card';
import { ChoiceField } from '@/components/ChoiceField';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { KIND_EDITORS, type FieldType } from '@/features/leads/editor/kinds';
import type { LeadKind } from '@/features/leads/leadKinds';
import type { LeadEditorOptions, LeadFormValues } from './lead.types';

const KEYBOARD: Record<FieldType, 'default' | 'number-pad'> = {
  text: 'default',
  multiline: 'default',
  url: 'default',
  int: 'number-pad',
  float: 'number-pad',
};

interface Props {
  kind: LeadKind;
  control: Control<LeadFormValues>;
  options: LeadEditorOptions;
}

/** Who the lead is: its name, super category, venue types (venues) and the kind's own details. */
export function LeadBasicsSection({ kind, control, options }: Readonly<Props>) {
  const { t } = useTranslation();
  const editor = KIND_EDITORS[kind];
  const watchedTypes: unknown = useWatch({ control, name: 'venue_types' as never });
  const venueTypes = Array.isArray(watchedTypes) ? watchedTypes : [];
  return (
    <Card title={t('crmApp.editor.basics')}>
      <TextField
        control={control}
        name={editor.nameField}
        label={t(`crmApp.editor.name.${kind}`)}
        testID="lead-name"
      />
      <ChoiceField
        control={control}
        name="super_category_id"
        label={t('crmApp.editor.superCategory')}
        options={options.superCategories}
        searchLabel={t('crmApp.editor.search')}
        testID="lead-super-category"
      />
      {editor.venueTypes ? (
        <ChoiceField
          control={control}
          name="venue_types"
          label={t('crmApp.editor.venueTypes')}
          options={options.venueTypes}
          multiple
          testID="lead-venue-types"
        />
      ) : null}
      {editor.venueTypes && venueTypes.includes('Other') ? (
        <TextField
          control={control}
          name="venue_type_other"
          label={t('crmApp.editor.venueTypeOther')}
          testID="lead-venue-type-other"
        />
      ) : null}
      {editor.fields.map((field) => (
        <TextField
          key={field.name}
          control={control}
          name={field.name}
          label={t(`crmApp.editor.field.${field.name}`)}
          multiline={field.type === 'multiline'}
          keyboardType={KEYBOARD[field.type]}
          testID={`lead-${field.name}`}
        />
      ))}
    </Card>
  );
}

import { type Control, type UseFormSetValue } from 'react-hook-form';

import { Card } from '@/components/Card';
import { ChoiceField } from '@/components/ChoiceField';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { KIND_EDITORS } from '@/features/leads/editor/kinds';
import type { LeadKind } from '@/features/leads/leadKinds';
import { FollowUpField } from './FollowUpField';
import type { LeadEditorOptions, LeadFormValues } from './lead.types';

interface Props {
  kind: LeadKind;
  control: Control<LeadFormValues>;
  setValue: UseFormSetValue<LeadFormValues>;
  options: LeadEditorOptions;
}

/** Where the lead stands: status, priority, who owns it, the next follow-up, its website and notes. */
export function LeadTrackingSection({ kind, control, setValue, options }: Readonly<Props>) {
  const { t } = useTranslation();
  const editor = KIND_EDITORS[kind];
  return (
    <Card title={t('crmApp.editor.tracking')}>
      <ChoiceField
        control={control}
        name="lead_status"
        label={t('crmApp.lead.status')}
        options={options.statuses}
        testID="lead-status"
      />
      <ChoiceField
        control={control}
        name="priority"
        label={t('crmApp.lead.priority')}
        options={options.priorities}
        testID="lead-priority"
      />
      <ChoiceField
        control={control}
        name="assigned_user_id"
        label={t('crmApp.lead.assignedTo')}
        options={options.users}
        noneLabel={t('crmApp.editor.unassigned')}
        searchLabel={t('crmApp.editor.search')}
        // The portal stores the name beside the id, so a list can show it without a lookup.
        onPick={(option) => setValue('assigned_to' as never, (option?.label ?? '') as never)}
        testID="lead-assignee"
      />
      <FollowUpField control={control} />
      <TextField
        control={control}
        name="website"
        label={t('crmApp.editor.field.website')}
        testID="lead-website"
      />
      <TextField
        control={control}
        name={editor.notesField}
        label={t('crmApp.lead.notes')}
        multiline
        testID="lead-notes"
      />
    </Card>
  );
}

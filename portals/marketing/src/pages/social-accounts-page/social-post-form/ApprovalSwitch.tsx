import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch } from '@mui/material';
import { HelpTip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { SocialPostFormValues } from './social-post.types';

/**
 * "Needs approval": park the post for a manager. Approved, it goes out at its
 * time; sent back, it returns to Drafts with the reviewer's note.
 */
export default function ApprovalSwitch({ control }: Readonly<{ control: Control<SocialPostFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="needs_approval"
      render={({ field }) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(_event, checked) => field.onChange(checked)} onBlur={field.onBlur} />}
            label={t('marketing.social.needsApproval')}
          />
          <HelpTip title={t('marketing.social.needsApprovalHint')} />
        </Stack>
      )}
    />
  );
}

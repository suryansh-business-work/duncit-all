import { Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel, Stack } from '@mui/material';
import { useController, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import type { SocialAccount } from '../queries';
import type { SocialPostFormValues } from './social-post.types';

interface Props {
  control: Control<SocialPostFormValues>;
  accounts: SocialAccount[];
}

/**
 * The accounts a post goes to, as checkboxes named by network and account.
 * An account that needs reconnecting cannot be picked — the post would fail.
 */
export default function AccountPicker({ control, accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name: 'account_ids' });
  const chosen = new Set(field.value);

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    field.onChange([...next]);
  };

  return (
    <FormControl component="fieldset" error={!!fieldState.error} data-testid="social-post-accounts">
      <FormLabel component="legend">{t('marketing.social.postTo')}</FormLabel>
      <FormGroup row>
        {accounts.map((account) => (
          <FormControlLabel
            key={account.id}
            disabled={account.status === 'EXPIRED'}
            control={<Checkbox checked={chosen.has(account.id)} onChange={() => toggle(account.id)} onBlur={field.onBlur} />}
            label={
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <PlatformIcon platform={account.platform} fontSize="small" sx={{ color: 'text.secondary' }} />
                <span>{account.name}</span>
              </Stack>
            }
          />
        ))}
      </FormGroup>
      <FormHelperText>{fieldState.error?.message ?? (accounts.length === 0 ? t('marketing.social.connectFirst') : ' ')}</FormHelperText>
    </FormControl>
  );
}

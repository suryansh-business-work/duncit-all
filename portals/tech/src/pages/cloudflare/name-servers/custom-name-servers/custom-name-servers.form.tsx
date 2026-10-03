import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import {
  blankCustomNameServers,
  customNameServersSchema,
  parseServers,
  type CustomNameServersForm as Values,
} from './custom-name-servers.types';

interface Props {
  busy: boolean;
  /** Resolves true once the switch went through, which clears the form. */
  onSubmit: (servers: string[]) => Promise<boolean>;
}

/**
 * Any other nameservers — a third provider, or GoDaddy's own typed in by hand
 * when its zone no longer lists them. Same confirm, same server checks.
 */
export default function CustomNameServersFormBody({ busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      customNameServersSchema({
        count: t('tech.cloudflare.validation.serverCount'),
        invalid: (names) => t('tech.cloudflare.validation.serverInvalid', { vars: { names } }),
      }),
    [t],
  );
  const { control, handleSubmit, reset } = useForm<Values, unknown, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values, unknown, Values>,
    defaultValues: blankCustomNameServers,
  });

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(parseServers(values.servers))) reset(blankCustomNameServers);
  });

  return (
    <SectionCard title={t('tech.cloudflare.customTitle')} subtitle={t('tech.cloudflare.customSubtitle')}>
      <Stack spacing={2} component="form" noValidate onSubmit={submit} data-testid="cloudflare-custom-form">
        <RhfTextField
          control={control}
          name="servers"
          label={t('tech.cloudflare.customLabel')}
          hint={t('tech.cloudflare.customHint')}
          multiline
          minRows={2}
          required
          data-testid="cloudflare-custom-servers"
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="outlined" startIcon={<DnsIcon />} loading={busy} data-testid="cloudflare-custom-submit">
            {t('tech.cloudflare.customSubmit')}
          </DuncitButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}

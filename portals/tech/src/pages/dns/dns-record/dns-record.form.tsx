import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, MenuItem, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { DnsRecordInput, DnsZone } from '@duncit/gql-types';
import { dnsRecordSchema, toInput, type DnsRecordForm as Values } from './dns-record.types';

interface Props {
  zone: Readonly<Pick<DnsZone, 'domain' | 'min_ttl' | 'max_ttl' | 'writable_types'>>;
  initial: Values;
  /** Editing an existing record: its type and name are its address, so both lock. */
  editing: boolean;
  saving: boolean;
  opError: string | null;
  onSubmit: (input: DnsRecordInput) => void;
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/**
 * The record editor. The type list, the TTL bounds and the domain every hint
 * names all come from `dnsZone`; the only thing decided here is that priority
 * is shown for MX alone, because that is the only writable type with one.
 */
export default function DnsRecordFormBody({ zone, initial, editing, saving, opError, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const ttlRange = t('tech.dns.ttlRange', { vars: { min: String(zone.min_ttl), max: String(zone.max_ttl) } });
  const schema = useMemo(
    () =>
      dnsRecordSchema(zone, {
        nameInvalid: t('tech.dns.validation.nameInvalid'),
        nameIsRelative: t('tech.dns.validation.nameIsRelative', { vars: { domain: zone.domain } }),
        valueRequired: t('tech.dns.validation.valueRequired'),
        ipv4: t('tech.dns.validation.ipv4'),
        ipv6: t('tech.dns.validation.ipv6'),
        ttlRange,
        priorityRange: t('tech.dns.validation.priorityRange'),
      }),
    [t, zone, ttlRange],
  );

  const { control, handleSubmit } = useForm<Values, any, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values, any, Values>,
    defaultValues: initial,
  });
  const type = useWatch({ control, name: 'type' });
  const addressHint = editing ? t('tech.dns.editKeepsAddress') : undefined;

  return (
    <Stack
      spacing={2}
      component="form"
      id="dns-record-form"
      data-testid="dns-record-form"
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toInput(values)))}
    >
      <Box sx={GRID}>
        <RhfTextField
          control={control}
          name="type"
          label={t('shell.common.type')}
          hint={addressHint ?? t('tech.dns.typeHint')}
          disabled={editing}
          required
          select
          data-testid="dns-record-type"
        >
          {zone.writable_types.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField
          control={control}
          name="name"
          label={t('shell.common.name')}
          hint={addressHint ?? t('tech.dns.nameHint', { vars: { domain: zone.domain } })}
          disabled={editing}
          required
          data-testid="dns-record-name"
        />
      </Box>
      <RhfTextField
        control={control}
        name="data"
        label={t('tech.dns.colValue')}
        hint={t('tech.dns.valueHint')}
        required
        multiline={type === 'TXT'}
        data-testid="dns-record-value"
      />
      <Box sx={GRID}>
        <RhfTextField
          control={control}
          name="ttl"
          type="number"
          label={t('tech.dns.colTtl')}
          hint={ttlRange}
          required
          slotProps={{ htmlInput: { min: zone.min_ttl, max: zone.max_ttl } }}
          data-testid="dns-record-ttl"
        />
        {type === 'MX' && (
          <RhfTextField
            control={control}
            name="priority"
            type="number"
            label={t('tech.dns.colPriority')}
            hint={t('tech.dns.priorityHint')}
            required
            slotProps={{ htmlInput: { min: 0 } }}
            data-testid="dns-record-priority"
          />
        )}
      </Box>

      {opError && (
        <Alert severity="error" data-testid="dns-record-error">
          {opError}
        </Alert>
      )}
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        loading={saving}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="dns-record-save"
      >
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}

import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import type { McpSettingsInput } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { SettingsData } from '../queries';
import ChipsField from './ChipsField';
import CurrencyField from './CurrencyField';
import GuardField from './GuardField';
import SwitchField from './SwitchField';
import {
  makeSettingsSchema,
  normalizeHost,
  SETTINGS_LIMITS,
  toSettingsInput,
  toSettingsValues,
  type SettingsFormOutput,
  type SettingsFormValues,
} from './settings.types';

export interface SettingsFormProps {
  settings: SettingsData;
  /** Every category the catalog has, for the switch-off picker. */
  categories: ReadonlyArray<{ category: string; label: string }>;
  /** Every tool name the catalog has. */
  toolNames: readonly string[];
  /** The browser's ISO 4217 currency codes (empty when it cannot list them). */
  currencies: readonly string[];
  saving: boolean;
  /** The server's answer when it refused the save. */
  errorMessage: string | null;
  onSubmit: (input: McpSettingsInput) => void;
}

/** The MCP settings: kill switches, the injection guard, the AI apps Duncit trusts, and token prices. */
export default function SettingsForm(props: Readonly<SettingsFormProps>) {
  const { settings, categories, toolNames, currencies, saving, errorMessage, onSubmit } = props;
  const { t } = useTranslation();
  const schema = useMemo(() => makeSettingsSchema(t, currencies), [t, currencies]);
  const { control, handleSubmit } = useForm<SettingsFormValues, unknown, SettingsFormOutput>({
    defaultValues: toSettingsValues(settings),
    resolver: zodResolver(schema) as Resolver<SettingsFormValues, unknown, SettingsFormOutput>,
    mode: 'onTouched',
  });
  const categoryKeys = useMemo(() => categories.map((entry) => entry.category), [categories]);
  const categoryLabel = useMemo(() => {
    const labels = new Map(categories.map((entry) => [entry.category, entry.label]));
    return (key: string) => labels.get(key) ?? key;
  }, [categories]);
  const { min, max } = SETTINGS_LIMITS.price;
  const priceInput = { htmlInput: { min, max, step: 'any', inputMode: 'decimal' as const } };

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toSettingsInput(values)))} noValidate>
      <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <SectionCard title={t('mcp.settings.sectionTools')}>
          <Stack spacing={2}>
            <SwitchField control={control} name="write_tools_enabled" label={t('mcp.settings.writeTools')} hint={t('mcp.settings.writeToolsHint')} />
            <ChipsField
              control={control}
              name="disabled_categories"
              label={t('mcp.settings.disabledCategories')}
              hint={t('mcp.settings.disabledCategoriesHint')}
              options={categoryKeys}
              labelOf={categoryLabel}
            />
            <ChipsField
              control={control}
              name="disabled_tools"
              label={t('mcp.settings.disabledTools')}
              hint={t('mcp.settings.disabledToolsHint')}
              options={toolNames}
            />
          </Stack>
        </SectionCard>
        <SectionCard title={t('mcp.settings.sectionSafety')}>
          <Stack spacing={2}>
            <GuardField control={control} name="default_injection_guard" />
            <ChipsField
              control={control}
              name="trusted_redirect_hosts"
              label={t('mcp.settings.trustedHosts')}
              hint={t('mcp.settings.trustedHostsHint')}
              freeSolo
              normalize={normalizeHost}
            />
            <SwitchField
              control={control}
              name="allow_untrusted_clients"
              label={t('mcp.settings.allowUntrusted')}
              hint={t('mcp.settings.allowUntrustedHint')}
            />
          </Stack>
        </SectionCard>
        <SectionCard title={t('mcp.settings.sectionPricing')} subtitle={t('mcp.settings.pricingHint')}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField
              control={control}
              name="token_price_input_per_million"
              type="number"
              label={t('mcp.settings.priceInput')}
              slotProps={priceInput}
              required
            />
            <RhfTextField
              control={control}
              name="token_price_output_per_million"
              type="number"
              label={t('mcp.settings.priceOutput')}
              slotProps={priceInput}
              required
            />
            <CurrencyField
              control={control}
              name="currency"
              label={t('mcp.settings.currency')}
              hint={t('mcp.settings.currencyHint')}
              currencies={currencies}
            />
          </Stack>
        </SectionCard>
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined} data-testid="mcp-settings-save">
            {saving ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}

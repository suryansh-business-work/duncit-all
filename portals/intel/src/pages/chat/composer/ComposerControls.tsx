import { Box, Checkbox, ListItemText, MenuItem, Select, Stack, type SelectChangeEvent } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { IntelModelOption } from '@duncit/gql-types';
import { ENV_LABEL_KEYS, SOURCE_KEYS, SOURCE_LABEL_KEYS, sourceIcon } from '../../../components/sources';
import MicButton from './MicButton';

export interface ComposerSettings {
  model: string;
  environment: string;
  /** Empty = all sources this person may use. */
  sources: string[];
}

interface Props {
  value: ComposerSettings;
  onChange: (next: ComposerSettings) => void;
  models: IntelModelOption[];
  environments: string[];
  allowedSources: string[];
  onVoice: (text: string) => void;
  disabled?: boolean;
}

const selectSx = { minWidth: 0, maxWidth: { xs: '100%', sm: 220 }, '& .MuiSelect-select': { py: 0.75, fontSize: '0.8125rem' } };

/** Under the input: model, microphone, environment and sources — saved with the conversation. */
export default function ComposerControls({ value, onChange, models, environments, allowedSources, onVoice, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const envChoices = environments.length === 2 ? ['STAGING', 'PRODUCTION', 'BOTH'] : environments;
  const sources = SOURCE_KEYS.filter((s) => allowedSources.includes(s));
  const onSources = (e: SelectChangeEvent<string[]>) => {
    const next = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
    onChange({ ...value, sources: next.includes('ALL') || next.length === sources.length ? [] : next.filter((s) => s !== 'ALL') });
  };
  const sourceLabel = (selected: string[]) => (selected.length === 0 ? t('intel.composer.allSources', { vars: { count: sources.length } }) : selected.map((s) => t(SOURCE_LABEL_KEYS[s] ?? 'intel.sources.MEDIA')).join(', '));

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center', px: 0.5 }}>
      <Select size="small" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} disabled={disabled} sx={selectSx} inputProps={{ 'aria-label': t('intel.composer.model') }}>
        {models.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {t('intel.composer.modelValue', { vars: { model: m.label } })}
          </MenuItem>
        ))}
      </Select>
      <MicButton onText={onVoice} disabled={disabled} />
      <Box sx={{ flex: { xs: '0 0 100%', sm: '0 0 auto' }, display: { xs: 'none', sm: 'block' } }} />
      <Select size="small" value={envChoices.includes(value.environment) ? value.environment : (envChoices[0] ?? 'STAGING')} onChange={(e) => onChange({ ...value, environment: e.target.value })} disabled={disabled} sx={selectSx} inputProps={{ 'aria-label': t('intel.composer.environment') }}>
        {envChoices.map((env) => (
          <MenuItem key={env} value={env}>
            {t('intel.composer.environmentValue', { vars: { env: t(ENV_LABEL_KEYS[env] ?? 'intel.env.STAGING') } })}
          </MenuItem>
        ))}
      </Select>
      <Select<string[]> size="small" multiple displayEmpty value={value.sources} onChange={onSources} renderValue={sourceLabel} disabled={disabled} sx={selectSx} inputProps={{ 'aria-label': t('intel.composer.sources') }}>
        <MenuItem value="ALL">
          <Checkbox size="small" checked={value.sources.length === 0} />
          <ListItemText primary={t('intel.composer.allSourcesOption')} />
        </MenuItem>
        {sources.map((s) => (
          <MenuItem key={s} value={s}>
            <Checkbox size="small" checked={value.sources.includes(s)} />
            <Box sx={{ mr: 1, display: 'flex', color: 'text.secondary' }} aria-hidden>
              {sourceIcon(s)}
            </Box>
            <ListItemText primary={t(SOURCE_LABEL_KEYS[s] ?? 'intel.sources.MEDIA')} />
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
}

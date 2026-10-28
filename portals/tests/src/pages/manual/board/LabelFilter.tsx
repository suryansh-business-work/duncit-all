import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useLabelOptions } from '../shared/useLabelOptions';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Filter the board to one label, picked from the labels cases already carry. */
export default function LabelFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useLabelOptions();
  return (
    <Autocomplete
      size="small"
      options={labels.options}
      value={value || null}
      loading={labels.loading}
      onChange={(_event, next) => onChange(next ?? '')}
      inputValue={labels.input}
      onInputChange={(_event, next) => labels.setInput(next)}
      noOptionsText={labels.error ? t('testsManual.filters.labelsFailed') : t('testsManual.filters.noLabels')}
      loadingText={t('testsManual.common.loading')}
      sx={{ minWidth: (theme) => theme.spacing(20) }}
      renderInput={(params) => <TextField {...params} label={t('testsManual.field.labels')} />}
    />
  );
}

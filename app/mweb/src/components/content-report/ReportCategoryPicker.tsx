import {
  Alert,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { ReportCategoryOption } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  options: ReportCategoryOption[];
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** True when the options could not be loaded and none are cached. */
  failed: boolean;
  /** The picked category's key; blank before a choice. */
  value: string;
  onChange: (key: string) => void;
  onRetry: () => void;
}

/**
 * The "What is wrong?" list in the report dialog. Native twin (rule 27).
 *
 * The options are the report categories Legal manages, so the list has three
 * honest states rather than one: still loading, could not load (with a way to
 * try again — a report nobody can file is worse than a slow one), and the
 * categories themselves.
 */
export default function ReportCategoryPicker({
  options,
  loading,
  failed,
  value,
  onChange,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Stack data-testid="report-categories-loading" sx={{ alignItems: 'center', py: 2 }}>
        <CircularProgress size={24} aria-label={t('contentReport.categoriesLoading')} />
      </Stack>
    );
  }

  if (failed) {
    return (
      <Alert
        data-testid="report-categories-failed"
        severity="error"
        action={
          <DuncitButton data-testid="report-categories-retry" color="inherit" size="small" onClick={onRetry}>
            {t('contentReport.categoriesRetry')}
          </DuncitButton>
        }
      >
        {t('contentReport.categoriesFailed')}
      </Alert>
    );
  }

  return (
    <FormControl component="fieldset" variant="standard">
      <FormLabel
        component="legend"
        sx={{ typography: 'overline', color: 'text.secondary', fontWeight: 600 }}
      >
        {t('contentReport.reasonLabel')}
      </FormLabel>
      <RadioGroup
        data-testid="report-categories"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.key}
            data-testid={`report-reason-${option.key}`}
            value={option.key}
            control={<Radio size="small" />}
            sx={{ alignItems: 'flex-start', '& .MuiRadio-root': { pt: 0.75 } }}
            label={
              <Stack sx={{ py: 0.5 }}>
                <Typography variant="body2">{option.label}</Typography>
                {option.description && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {option.description}
                  </Typography>
                )}
              </Stack>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { toggleSuite } from './run-tests/run-tests.types';
import type { E2eSuite, E2eSuiteGroup } from './queries';

const GROUP_ORDER: E2eSuiteGroup[] = ['PORTAL', 'APP', 'SHARED'];

interface Props {
  suites: E2eSuite[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
  error?: string;
}

/**
 * Which suites to run. Shared by the Run-tests dialog and the schedule
 * settings, because "pick some suites" is one question and two pickers would
 * be two places for the catalogue's grouping to disagree.
 */
export default function SuitePicker({ suites, value, onChange, label, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const order = suites.map((suite) => suite.key);
  const groupLabels: Record<E2eSuiteGroup, string> = {
    PORTAL: t('tech.e2e.groupPortal'),
    APP: t('tech.e2e.groupApp'),
    SHARED: t('tech.e2e.groupShared'),
  };

  return (
    <FormControl component="fieldset" error={Boolean(error)} fullWidth>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
      >
        <FormLabel component="legend" sx={{ fontSize: 14 }}>
          {label}
        </FormLabel>
        {/* type="button" is load-bearing: this picker renders inside a form,
            and a bare button in a form submits it. */}
        <Stack direction="row" spacing={0.5}>
          <DuncitButton type="button" size="small" onClick={() => onChange(order)}>
            {t('tech.e2e.selectAll')}
          </DuncitButton>
          <DuncitButton type="button" size="small" onClick={() => onChange([])}>
            {t('tech.e2e.selectNone')}
          </DuncitButton>
        </Stack>
      </Stack>
      {GROUP_ORDER.map((group) => {
        const inGroup = suites.filter((suite) => suite.group === group);
        if (inGroup.length === 0) return null;
        return (
          <Stack key={group} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {groupLabels[group]}
            </Typography>
            <FormGroup row>
              {inGroup.map((suite) => (
                <FormControlLabel
                  key={suite.key}
                  sx={{ minWidth: 165 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={value.includes(suite.key)}
                      onChange={(event) =>
                        onChange(toggleSuite(value, suite.key, event.target.checked, order))
                      }
                    />
                  }
                  label={suite.label}
                />
              ))}
            </FormGroup>
          </Stack>
        );
      })}
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}

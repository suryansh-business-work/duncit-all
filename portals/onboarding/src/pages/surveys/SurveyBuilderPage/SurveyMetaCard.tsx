import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import type { SurveyKind } from '../queries';
import ScopePicker, { type Scope } from '../ScopePicker';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  isDefaultMode: boolean;
  kind: SurveyKind;
  setKind: Dispatch<SetStateAction<SurveyKind>>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  isActive: boolean;
  setIsActive: Dispatch<SetStateAction<boolean>>;
  scope: Scope;
  setScope: Dispatch<SetStateAction<Scope>>;
}

/** Kind, title, active switch and category scope of the survey being built. */
export default function SurveyMetaCard({
  isDefaultMode,
  kind,
  setKind,
  title,
  setTitle,
  isActive,
  setIsActive,
  scope,
  setScope,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined"><CardContent>
      <Stack spacing={1.75}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          alignItems: { sm: 'center' }
        }}>
          {!isDefaultMode && (
            <TextField select size="small" label={t('onboarding.surveys.kind')} value={kind} onChange={(e) => setKind(e.target.value as SurveyKind)} sx={{ minWidth: 160 }}>
              <MenuItem value="VENUE">{t('onboarding.common.venue')}</MenuItem>
              <MenuItem value="HOST">Host</MenuItem>
              <MenuItem value="ECOMM">E-Commerce Brand</MenuItem>
              <MenuItem value="CLUB_ADMIN">{t('onboarding.common.clubAdmin')}</MenuItem>
            </TextField>
          )}
          <TextField size="small" label={t('onboarding.surveys.surveyTitle')} value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }} fullWidth />
          <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label={t('onboarding.common.active')} />
        </Stack>
        {!isDefaultMode && (
          <ScopePicker
            value={scope}
            onChange={setScope}
            legend="Survey scope"
            hint="Pick a Super → Category → Sub. Leave every level empty for the kind-level default."
          />
        )}
      </Stack>
    </CardContent></Card>
  );
}

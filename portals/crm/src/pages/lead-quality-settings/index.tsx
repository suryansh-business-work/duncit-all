import { useMemo } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../api/crm.types';
import LeadTypeSettings from './LeadTypeSettings';
import { leadTypeTabs } from './leadTypeTabs';

const TABS_ID = 'lead-quality';

/**
 * CRM › Leads › Settings › Lead Quality Score: how each lead type is scored out
 * of 100. One tab per lead type; each has its own published version, an
 * optional draft and its version history.
 */
export default function LeadQualitySettingsPage() {
  const { t } = useTranslation();
  const items = useMemo(() => leadTypeTabs(t), [t]);
  const tabs = useTabParam<CrmLeadEntityType>({ items, fallback: 'HOST_LEAD' });

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TuneIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {t('crm.leadQualitySettings.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.leadQualitySettings.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        <DuncitTabs
          {...tabs}
          idPrefix={TABS_ID}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={t('crm.leadQualitySettings.leadTypesAria')}
        />
      </Card>
      <Box {...tabPanelProps(TABS_ID, tabs.value)}>
        <LeadTypeSettings key={tabs.value} leadType={tabs.value} />
      </Box>
    </Stack>
  );
}

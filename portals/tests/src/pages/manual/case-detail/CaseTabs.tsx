import { useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import ActivityTimeline from './activity/ActivityTimeline';
import CommentsThread from './comments/CommentsThread';

type CaseTab = 'comments' | 'activity';

const ID_PREFIX = 'manual-case';

interface Props {
  caseId: string;
}

/** Comments and Activity under the case body; the open tab is in the URL. */
export default function CaseTabs({ caseId }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<CaseTab>[]>(
    () => [
      { value: 'comments', label: t('testsManual.detail.comments') },
      { value: 'activity', label: t('testsManual.detail.activity') },
    ],
    [t]
  );
  const tabs = useTabParam<CaseTab>({ items, fallback: 'comments' });

  return (
    <Paper variant="outlined">
      <DuncitTabs {...tabs} idPrefix={ID_PREFIX} sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }} />
      <Box {...tabPanelProps(ID_PREFIX, tabs.value)} sx={{ p: 2 }}>
        {tabs.value === 'comments' ? <CommentsThread caseId={caseId} /> : <ActivityTimeline caseId={caseId} />}
      </Box>
    </Paper>
  );
}

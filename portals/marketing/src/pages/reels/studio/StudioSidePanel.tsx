import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, type DuncitTabsState } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';

export type SideTab = 'chat' | 'create' | 'edit';

const ID_PREFIX = 'reel-side';

interface Props {
  tabs: DuncitTabsState<SideTab>;
  chat: ReactNode;
  create: ReactNode;
  edit: ReactNode;
}

/**
 * The studio's right-hand pane: the conversation with the editor, the guided
 * Create flow, or the selected timeline item's settings. Selecting something
 * on the timeline opens Edit; the open tab lives in the URL, so a reload lands
 * on the same one.
 */
export default function StudioSidePanel({ tabs, chat, create, edit }: Readonly<Props>) {
  const { t } = useTranslation();
  const panels: Record<SideTab, ReactNode> = { chat, create, edit };
  return (
    <Stack sx={{ height: '100%', minHeight: 0 }} data-tour="studio-create" data-testid="reel-side-panel">
      <DuncitTabs {...tabs} idPrefix={ID_PREFIX} variant="fullWidth" aria-label={t('ai.reels.editor.tabsLabel')} />
      <Box {...tabPanelProps(ID_PREFIX, tabs.value)} sx={{ flex: 1, minHeight: 0, overflowY: tabs.value === 'chat' ? 'hidden' : 'auto' }}>
        {panels[tabs.value]}
      </Box>
    </Stack>
  );
}

import { useMemo } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import type { ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import AssetList from './AssetList';
import DriveTab from './DriveTab';
import StockTab from './StockTab';
import UploadTab from './UploadTab';
import VoiceTab from './VoiceTab';

export type SourceTab = 'drive' | 'stock' | 'upload' | 'voice';

/** Its own query key: the side panel owns `selectedtab`. */
export const SOURCE_TAB_PARAM = 'sources';
const ID_PREFIX = 'reel-sources';

interface Props {
  project: ReelProject;
  actions: ReelActions;
  /** Opens the reel's details, where its Drive folder link is set. */
  onEditDetails: () => void;
}

/**
 * The left pane: what the reel holds, and the four shelves it is filled from —
 * the Drive folder, stock footage, the operator's own files, and generated
 * voice. The editor only ever sees what is in the reel, so a shelf of
 * hundreds of files costs nothing until something is taken off it.
 */
export default function SourcesPanel({ project, actions, onEditDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = useMemo(
    () => [
      { value: 'drive' as const, label: t('ai.reels.sources.driveTitle'), testId: 'reel-sources-tab-drive' },
      { value: 'stock' as const, label: t('ai.reels.sources.tabStock'), testId: 'reel-sources-tab-stock' },
      { value: 'upload' as const, label: t('ai.reels.sources.tabUpload'), testId: 'reel-sources-tab-upload' },
      { value: 'voice' as const, label: t('ai.reels.sources.tabVoice'), testId: 'reel-sources-tab-voice' },
    ],
    [t]
  );
  const tabs = useTabParam<SourceTab>({ items, fallback: 'drive', param: SOURCE_TAB_PARAM });

  const usedAssetIds = useMemo(() => {
    const used = new Set<string>();
    for (const scene of project.spec.scenes) {
      if (scene.asset_id) used.add(scene.asset_id);
      for (const overlay of scene.overlays) used.add(overlay.asset_id);
    }
    if (project.spec.music) used.add(project.spec.music.asset_id);
    if (project.spec.voiceover) used.add(project.spec.voiceover.asset_id);
    if (project.spec.brand.watermark_asset_id) used.add(project.spec.brand.watermark_asset_id);
    return used;
  }, [project.spec]);

  return (
    <Stack component="section" aria-labelledby="reel-sources-assets-title" sx={{ height: '100%', minHeight: 0 }} data-tour="studio-sources" data-testid="reel-sources-panel">
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Typography id="reel-sources-assets-title" variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
          {t('ai.reels.sources.assetsTitle', { vars: { count: project.assets.length } })}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('ai.reels.sources.assetsHint')}
        </Typography>
      </Box>
      <Box sx={{ maxHeight: '38%', overflowY: 'auto', flexShrink: 0 }}>
        <AssetList assets={project.assets} usedAssetIds={usedAssetIds} onRemove={actions.removeAsset} />
      </Box>
      <Divider />
      <DuncitTabs {...tabs} idPrefix={ID_PREFIX} variant="fullWidth" aria-label={t('ai.reels.sources.tabsLabel')} />
      <Stack {...tabPanelProps(ID_PREFIX, tabs.value)} sx={{ flex: 1, minHeight: 0 }}>
        {tabs.value === 'drive' && <DriveTab project={project} actions={actions} onEditDetails={onEditDetails} />}
        {tabs.value === 'stock' && <StockTab project={project} actions={actions} />}
        {tabs.value === 'upload' && <UploadTab actions={actions} />}
        {tabs.value === 'voice' && <VoiceTab project={project} />}
      </Stack>
    </Stack>
  );
}

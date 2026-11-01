import { useMemo, type ReactNode } from 'react';
import { Box, Chip, Divider, Slider, Stack, Tooltip } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import RedoIcon from '@mui/icons-material/Redo';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import UndoIcon from '@mui/icons-material/Undo';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { SaveState, SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset } from '../../types';
import AddMenu, { type AddOption } from './AddMenu';
import type { TimelineActions } from './useTimelineActions';
import { MAX_ZOOM, MIN_ZOOM } from './geometry';

const SAVE_LABEL: Readonly<Record<SaveState, string>> = {
  saved: 'ai.reels.editor.savedState',
  pending: 'ai.reels.editor.pendingState',
  saving: 'ai.reels.editor.savingState',
  failed: 'ai.reels.editor.failedState',
};

/** An icon action; its tooltip is its accessible name. Wrapped so a disabled one still explains itself. */
function Tool({ label, icon, onClick, disabled, testId }: Readonly<{ label: string; icon: ReactNode; onClick: () => void; disabled: boolean; testId: string }>) {
  return (
    <Tooltip title={label}>
      <span>
        <DuncitIconButton size="small" onClick={onClick} disabled={disabled} data-testid={testId}>
          {icon}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}

const asOptions = (assets: readonly ReelAsset[]): AddOption[] =>
  assets.map((asset) => ({ id: asset.id, label: asset.name, asset }));

interface Props {
  assets: readonly ReelAsset[];
  actions: TimelineActions;
  editor: Pick<SpecEditor, 'undo' | 'redo' | 'canUndo' | 'canRedo' | 'saveState'>;
  zoom: number;
  onZoom: (zoom: number) => void;
}

/** Everything the timeline can do to the reel, above its tracks. */
export default function TimelineToolbar({ assets, actions, editor, zoom, onZoom }: Readonly<Props>) {
  const { t } = useTranslation();
  const { can } = actions;
  const sceneOptions = useMemo(
    () => [
      { id: 'card', label: t('ai.reels.editor.addColourCard'), asset: null },
      ...asOptions(assets.filter((asset) => asset.kind !== 'AUDIO')),
    ],
    [assets, t]
  );
  const pictures = useMemo(() => asOptions(assets.filter((asset) => asset.kind === 'IMAGE')), [assets]);
  const songs = useMemo(() => asOptions(assets.filter((asset) => asset.kind === 'AUDIO')), [assets]);
  const musicOptions = songs.length > 0 ? [...songs, { id: 'none', label: t('ai.reels.editor.removeMusic'), asset: null }] : [];

  return (
    <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }} data-testid="reel-timeline-toolbar">
      <AddMenu label={t('ai.reels.editor.addScene')} icon={<VideoLibraryOutlinedIcon />} options={sceneOptions} emptyText={t('ai.reels.editor.noFootage')} disabled={!can.addScene} onPick={actions.addSceneOf} testId="reel-add-scene" />
      <DuncitButton size="small" startIcon={<TextFieldsIcon />} disabled={!can.addText} onClick={actions.addTextHere} data-testid="reel-add-text">
        {t('ai.reels.editor.addText')}
      </DuncitButton>
      <AddMenu
        label={t('ai.reels.editor.addOverlay')}
        icon={<AddPhotoAlternateOutlinedIcon />}
        options={pictures}
        emptyText={t('ai.reels.editor.noPictures')}
        disabled={!can.addOverlay}
        onPick={(asset) => {
          if (asset) actions.addOverlayOf(asset);
        }}
        testId="reel-add-overlay"
      />
      <AddMenu label={t('ai.reels.editor.addMusic')} icon={<LibraryMusicOutlinedIcon />} options={musicOptions} emptyText={t('ai.reels.editor.noSound')} onPick={actions.chooseMusic} testId="reel-add-music" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tool label={t('ai.reels.editor.split')} icon={<ContentCutIcon />} onClick={actions.split} disabled={!can.split} testId="reel-split" />
      <Tool label={t('ai.reels.editor.duplicate')} icon={<ContentCopyIcon />} onClick={actions.duplicate} disabled={!can.duplicate} testId="reel-duplicate" />
      <Tool label={t('ai.reels.editor.moveEarlier')} icon={<ArrowBackIcon />} onClick={() => actions.move(-1)} disabled={!can.moveEarlier} testId="reel-move-earlier" />
      <Tool label={t('ai.reels.editor.moveLater')} icon={<ArrowForwardIcon />} onClick={() => actions.move(1)} disabled={!can.moveLater} testId="reel-move-later" />
      <Tool label={t('ai.reels.editor.remove')} icon={<DeleteOutlineIcon />} onClick={actions.remove} disabled={!can.remove} testId="reel-remove" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tool label={t('ai.reels.editor.undo')} icon={<UndoIcon />} onClick={editor.undo} disabled={!editor.canUndo} testId="reel-undo" />
      <Tool label={t('ai.reels.editor.redo')} icon={<RedoIcon />} onClick={editor.redo} disabled={!editor.canRedo} testId="reel-redo" />
      <Box sx={{ flex: 1 }} />
      <Chip size="small" variant="outlined" role="status" label={t(SAVE_LABEL[editor.saveState])} color={editor.saveState === 'failed' ? 'error' : 'default'} data-testid="reel-save-state" />
      <Slider
        size="small"
        value={zoom}
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={10}
        onChange={(_event, value) => onZoom(value as number)}
        aria-label={t('ai.reels.editor.zoomLabel')}
        sx={{ width: 110, mx: 1.5 }}
        data-testid="reel-zoom"
      />
    </Stack>
  );
}

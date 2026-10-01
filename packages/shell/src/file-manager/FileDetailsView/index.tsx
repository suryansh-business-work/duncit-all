import { useMemo, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import FileInfoPanel from '../FileInfoPanel';
import { RENAME_MEDIA_FILE, UPDATE_MEDIA_FILE, type MediaItem } from '../queries';
import { useTranslation } from '../../i18n/useTranslation';
import FileEditPanel from './FileEditPanel';
import FileStepper from './FileStepper';

interface Props {
  file: MediaItem;
  /** False for a reader — the write mutations are role-guarded server-side. */
  canWrite: boolean;
  onBack: () => void;
  onCopy: (url: string) => void;
  onDelete: (file: MediaItem) => void;
  /** A rename or a tag edit returns the new record; the grid takes it. */
  onChanged: (file: MediaItem) => void;
  onError: (message: string) => void;
  /**
   * The ticked files, in grid order, when this one is among them.
   *
   * Ticking five images and stepping through them is the reason this panel is
   * beside the grid rather than over it — going back to find the next one each
   * time is the part that made copying five links tedious.
   */
  siblings?: MediaItem[];
  onNavigate?: (file: MediaItem) => void;
}

type TabKey = 'info' | 'edit';
const TAB_SX = { minHeight: 36, minWidth: 0, px: 1 };

type Translate = ReturnType<typeof useTranslation>['t'];

/** A mutation always rejects with an Error; the fallback covers a caller that doesn't. */
export const describeSaveError = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/** Tab labels are copy, so the strip is built from the active catalogue.
 *  @duncit/tabs is framework-free and takes resolved text, not keys. */
const buildTabs = (t: Translate, canWrite: boolean): DuncitTabItem<TabKey>[] => {
  const info = { value: 'info' as const, label: t('shell.fileManager.info'), sx: TAB_SX };
  if (!canWrite) return [info];
  return [info, { value: 'edit' as const, label: t('shell.fileManager.edit'), sx: TAB_SX }];
};

/**
 * One file, opened INSIDE the dialog rather than in a drawer over it.
 *
 * A drawer on top of a dialog is two overlapping surfaces with two ways to
 * close them, and the one underneath is still scrollable behind the one you are
 * reading. This is a narrow column beside the grid instead, so the file you
 * came from is still on screen while you read the one you opened.
 *
 * Info is first because the commonest visit is "what is this and where is it".
 * Edit is the only tab that changes anything stored, and it is not shown to
 * someone who cannot use it.
 */
export default function FileDetailsView({
  file,
  canWrite,
  onBack,
  onCopy,
  onDelete,
  onChanged,
  onError,
  siblings,
  onNavigate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Own key — this panel sits beside the grid inside the File Manager dialog,
  // which opens over portal pages that have their own tab strip.
  const tabItems = useMemo(() => buildTabs(t, canWrite), [t, canWrite]);
  const tabs = useTabParam<TabKey>({
    items: tabItems,
    fallback: 'info',
    param: 'selectedtab_file',
  });
  const tab = tabs.value;
  const setTab = tabs.onChange;
  const [name, setName] = useState(file.name);
  const [tags, setTags] = useState<string[]>(file.tags);
  const [rename, renameState] = useMutation<any>(RENAME_MEDIA_FILE);
  const [update, updateState] = useMutation<any>(UPDATE_MEDIA_FILE);

  useEffect(() => {
    setTab('info');
    setName(file.name);
    setTags(file.tags);
  }, [file, setTab]);

  const busy = renameState.loading || updateState.loading;

  // Only when this file is actually one of the ticked ones — a stepper that
  // cannot say where you are in the set is worse than none.
  const list = siblings ?? [];
  const at = list.findIndex((item) => item.fileId === file.fileId);
  const stepping = at !== -1 && list.length > 1 && Boolean(onNavigate);
  const step = (delta: number) => onNavigate?.(list[at + delta]);

  const saveName = async () => {
    if (!name.trim() || name === file.name) return;
    try {
      const res = await rename({
        variables: { fileId: file.fileId, newFileName: name.trim(), purgeCache: true },
      });
      onChanged(res.data.renameMediaFile);
    } catch (err) {
      onError(describeSaveError(err, t('shell.fileManager.renameFailed')));
    }
  };

  const saveTags = async () => {
    try {
      const res = await update({ variables: { fileId: file.fileId, tags } });
      onChanged(res.data.updateMediaFile);
    } catch (err) {
      onError(describeSaveError(err, t('shell.fileManager.tagsFailed')));
    }
  };

  return (
    <Box>
      {stepping && <FileStepper at={at} total={list.length} onStep={step} />}

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          mb: 1
        }}>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }} title={file.name}>
          {file.name}
        </Typography>
        <DuncitIconButton size="small" onClick={onBack} aria-label={t('shell.fileManager.closeDetails')}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
        <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(file.url)}>
          Copy
        </DuncitButton>
        {canWrite && (
          <DuncitButton
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onDelete(file)}
          >
            Delete
          </DuncitButton>
        )}
      </Stack>

      <DuncitTabs {...tabs} variant="scrollable" scrollButtons={false} sx={{ minHeight: 36 }} />
      <Divider sx={{ mb: 2 }} />

      {tab === 'info' && <FileInfoPanel file={file} />}
      {tab === 'edit' && canWrite && (
        <FileEditPanel
          name={name}
          onName={setName}
          nameUnchanged={name === file.name}
          tags={tags}
          onTags={setTags}
          busy={busy}
          onSaveName={saveName}
          onSaveTags={saveTags}
        />
      )}
    </Box>
  );
}

import { useMemo, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Autocomplete, Box, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import FileInfoPanel from './FileInfoPanel';
import { RENAME_MEDIA_FILE, UPDATE_MEDIA_FILE, type MediaItem } from './queries';
import { useTranslation } from '../i18n/useTranslation';

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
      {stepping && (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.5
          }}>
          <DuncitIconButton
            size="small"
            onClick={() => step(-1)}
            disabled={at === 0}
            aria-label={t('shell.fileManager.prevFile')}
          >
            <ChevronLeftIcon fontSize="small" />
          </DuncitIconButton>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {at + 1} of {list.length} selected
          </Typography>
          <DuncitIconButton
            size="small"
            onClick={() => step(1)}
            disabled={at === list.length - 1}
            aria-label={t('shell.fileManager.nextFile')}
          >
            <ChevronRightIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      )}

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
        <Stack spacing={2}>
          <Stack spacing={1} sx={{
            alignItems: "flex-start"
          }}>
            <TextField
              fullWidth
              size="small"
              label={t('shell.fileManager.fileName')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText={t('shell.fileManager.renameHint')}
            />
            <DuncitButton size="small" onClick={saveName} disabled={busy || name === file.name}>
              Save
            </DuncitButton>
          </Stack>
          <Stack spacing={1} sx={{
            alignItems: "flex-start"
          }}>
            <Autocomplete
              multiple
              freeSolo
              fullWidth
              size="small"
              options={[]}
              value={tags}
              onChange={(_event, next) => setTags(next.map((tag) => String(tag).trim()).filter(Boolean))}
              renderValue={(value, getItemProps) =>
                value.map((tag, index) => {
                  // getTagProps supplies the key; spreading it after an explicit
                  // one would let React's own win and break deletion.
                  const { key, ...rest } = getItemProps({ index });
                  return <Chip key={key} size="small" label={tag} {...rest} />;
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('shell.fileManager.tags')}
                  helperText={t('shell.fileManager.tagsHint')}
                />
              )}
            />
            <DuncitButton size="small" onClick={saveTags} disabled={busy}>
              Save
            </DuncitButton>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

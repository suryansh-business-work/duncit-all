import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, MenuItem, Paper, Stack, TextField } from '@mui/material';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { useTranslation } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { isFolderPath } from '@duncit/regex';
import { parseApiError } from '@duncit/utils';
import { INTEL_CREATE_FOLDER } from '../../graphql/media';
import { MEDIA_VIEWS, VIEW_KEYS, type MediaView } from './labels';

interface Props {
  view: MediaView;
  folder: string;
  folders: string[];
  onView: (view: MediaView) => void;
  onFolder: (folder: string) => void;
  onFolderCreated: () => void;
}

/** Views and folders. A list on desktop, two selects on a phone. */
export default function MediaSidebar({ view, folder, folders, onView, onFolder, onFolderCreated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);
  const [createFolder, { loading }] = useMutation(INTEL_CREATE_FOLDER);
  const path = `${folder === '/' ? '' : folder}/${name.trim()}`;
  const valid = name.trim().length > 0 && isFolderPath(path);

  const create = async () => {
    try {
      const res = await createFolder({ variables: { path } });
      onFolderCreated();
      onFolder(String((res.data as { intelCreateFolder?: string } | undefined)?.intelCreateFolder ?? path));
      setCreating(false);
      setName('');
    } catch (err) {
      notifyError(parseApiError(err, t('intel.media.folderFailed')));
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ display: { xs: 'flex', md: 'none' } }}>
        <TextField select size="small" fullWidth label={t('intel.media.viewLabel')} value={view} onChange={(e) => onView(e.target.value as MediaView)}>
          {MEDIA_VIEWS.map((v) => (
            <MenuItem key={v} value={v}>{t(VIEW_KEYS[v])}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" fullWidth label={t('intel.media.folderLabel')} value={folder} onChange={(e) => onFolder(e.target.value)} disabled={view !== 'ALL'}>
          {folders.map((f) => (
            <MenuItem key={f} value={f}>{f}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <Paper variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2, width: 240, flexShrink: 0, alignSelf: 'flex-start' }}>
        <List dense aria-label={t('intel.media.viewLabel')}>
          {MEDIA_VIEWS.map((v) => (
            <ListItemButton key={v} selected={view === v} onClick={() => onView(v)}>
              <ListItemText primary={t(VIEW_KEYS[v])} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List dense subheader={<ListSubheader disableSticky>{t('intel.media.folders')}</ListSubheader>} aria-label={t('intel.media.folders')}>
          {folders.map((f) => (
            <ListItemButton key={f} selected={view === 'ALL' && folder === f} onClick={() => { onView('ALL'); onFolder(f); }}>
              <ListItemIcon sx={{ minWidth: 32 }}><FolderOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={f === '/' ? t('intel.media.rootFolder') : f} slotProps={{ primary: { noWrap: true } }} />
            </ListItemButton>
          ))}
        </List>
        <Stack spacing={1} sx={{ p: 1.5 }}>
          {creating ? (
            <>
              <TextField size="small" inputRef={nameRef} label={t('intel.media.newFolderName')} value={name} onChange={(e) => setName(e.target.value)} error={name.length > 0 && !valid} helperText={name.length > 0 && !valid ? t('intel.media.details.folderInvalid') : ' '} />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" disabled={!valid || loading} onClick={create}>{t('intel.common.create')}</Button>
                <Button size="small" onClick={() => setCreating(false)}>{t('intel.common.cancel')}</Button>
              </Stack>
            </>
          ) : (
            <Button size="small" startIcon={<CreateNewFolderOutlinedIcon />} onClick={() => setCreating(true)}>{t('intel.media.newFolder')}</Button>
          )}
        </Stack>
      </Paper>
    </>
  );
}

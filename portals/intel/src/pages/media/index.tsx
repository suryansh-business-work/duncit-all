import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import { useBootstrap } from '../../components/IntelBootstrap';
import { INTEL_MEDIA, type IntelMedia, type MediaData } from '../../graphql/media';
import FileDetailDialog from './FileDetailDialog';
import LinkedFile from './LinkedFile';
import { MEDIA_VIEWS, VISIBILITY_KEYS, type MediaView } from './labels';
import MediaSidebar from './MediaSidebar';
import MediaTable from './MediaTable';
import UploadZone from './UploadZone';
import { useUploads } from './useUploads';

const UPLOAD_VISIBILITIES = ['PRIVATE', 'TEAM', 'ADMINS'] as const;

/**
 * The Media Manager: upload PDFs, images and text (each indexed for search
 * automatically), organise them in folders, preview, share and clean up.
 * View and folder live in the URL so a page can be linked and reloaded.
 */
export default function MediaPage() {
  const { t } = useTranslation();
  const { data: boot } = useBootstrap();
  const [params, setParams] = useSearchParams();
  const view = (MEDIA_VIEWS as readonly string[]).includes(params.get('view') ?? '') ? (params.get('view') as MediaView) : 'ALL';
  const folder = params.get('folder') ?? '/';
  const [visibility, setVisibility] = useState<string>('PRIVATE');
  const [open, setOpen] = useState<IntelMedia | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);
  const folders = useQuery<MediaData>(INTEL_MEDIA, { variables: { view: 'ALL', page: 1, page_size: 1 }, fetchPolicy: 'cache-and-network' });
  const folderList = folders.data?.intelMediaFolders ?? ['/'];
  const reload = () => {
    refetchRef.current?.();
    folders.refetch().catch(() => undefined);
  };
  const uploads = useUploads({ folder, visibility, maxMb: boot?.upload_max_mb ?? 0, types: boot?.upload_types ?? [], onUploaded: reload });
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key === 'view' && value !== 'ALL') next.delete('folder');
    setParams(next, { replace: true });
  };
  // A file linked from a chat citation (/media?file=<id>) opens straight away.
  const linked = params.get('file');

  return (
    <Stack spacing={2}>
      <PageHeader title={t('intel.media.title')} subtitle={t('intel.media.subtitle')} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
        <MediaSidebar view={view} folder={folder} folders={folderList} onView={(v) => setParam('view', v)} onFolder={(f) => setParam('folder', f)} onFolderCreated={reload} />
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          {view === 'ALL' && (
            <Box>
              <TextField select size="small" label={t('intel.media.uploadVisibility')} value={visibility} onChange={(e) => setVisibility(e.target.value)} sx={{ mb: 1.5, minWidth: 220 }}>
                {UPLOAD_VISIBILITIES.map((v) => (
                  <MenuItem key={v} value={v}>{t(VISIBILITY_KEYS[v] ?? 'intel.media.visibility.PRIVATE')}</MenuItem>
                ))}
              </TextField>
              <UploadZone items={uploads.items} maxMb={boot?.upload_max_mb ?? 0} types={boot?.upload_types ?? []} onFiles={uploads.add} onClear={uploads.clearFinished} />
            </Box>
          )}
          <MediaTable view={view} folder={folder} onOpen={setOpen} refetchRef={refetchRef} />
        </Stack>
      </Stack>
      {linked && !open && <LinkedFile id={linked} onOpen={setOpen} />}
      <FileDetailDialog
        file={open}
        folders={folderList}
        onClose={() => {
          setOpen(null);
          if (linked) {
            const next = new URLSearchParams(params);
            next.delete('file');
            setParams(next, { replace: true });
          }
        }}
        onChanged={reload}
      />
    </Stack>
  );
}

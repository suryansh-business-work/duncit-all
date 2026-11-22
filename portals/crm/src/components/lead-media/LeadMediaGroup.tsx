import { Box, Stack, Typography } from '@mui/material';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadMedia } from '../../api/leadMedia.gql';
import ImageTile from '../image-library/ImageTile';
import ImageUploadButton from '../image-library/ImageUploadButton';
import ImageGrid from '../image-library/ImageGrid';
import { imageMeta } from '../image-library/imageMeta';
import { LEAD_MEDIA_LIMITS, LEAD_MEDIA_TYPES, type LEAD_MEDIA_GROUPS } from './leadMediaConfig';

type Group = (typeof LEAD_MEDIA_GROUPS)[number];

export interface LeadMediaItemActions {
  preview: (item: CrmLeadMedia) => void;
  replace: (item: CrmLeadMedia) => void;
  rename: (item: CrmLeadMedia) => void;
  move: (item: CrmLeadMedia) => void;
  remove: (item: CrmLeadMedia) => void;
}

interface Props {
  group: Group;
  items: CrmLeadMedia[];
  busy: boolean;
  onUpload: (files: FileList) => void;
  actions: LeadMediaItemActions;
}

/** One half of Logos & Images: its heading, the upload button and the grid (or an empty state). */
export default function LeadMediaGroup({ group, items, busy, onUpload, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const limit = LEAD_MEDIA_LIMITS[group.kind];
  const full = items.length >= limit;
  const moveLabel = group.kind === 'LOGO' ? t('crm.media.moveToImages') : t('crm.media.moveToLogos');

  return (
    <Stack component="section" spacing={1.5} aria-label={t(group.titleKey)}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t(group.titleKey)}{' '}
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
              {t('crm.media.countOfLimit', { vars: { count: items.length, limit } })}
            </Typography>
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t(group.hintKey)}
          </Typography>
        </Box>
        <ImageUploadButton
          label={t(group.uploadKey)}
          accept={LEAD_MEDIA_TYPES}
          busy={busy}
          disabled={full}
          onFiles={onUpload}
          testId={`lead-media-upload-${group.kind}`}
        />
      </Stack>

      <ImageGrid items={items} emptyText={t(group.emptyKey)}>
        {(item) => (
          <ImageTile
            url={item.url}
            name={item.name}
            meta={imageMeta(item)}
            fit={group.fit}
            onPreview={() => actions.preview(item)}
            actions={[
              { key: 'preview', label: t('crm.media.preview'), icon: <ZoomInIcon fontSize="small" />, onClick: () => actions.preview(item) },
              { key: 'replace', label: t('crm.media.replace'), icon: <FindReplaceIcon fontSize="small" />, onClick: () => actions.replace(item), disabled: busy },
              { key: 'rename', label: t('crm.media.rename'), icon: <DriveFileRenameOutlineIcon fontSize="small" />, onClick: () => actions.rename(item), disabled: busy },
              { key: 'move', label: moveLabel, icon: <SwapHorizIcon fontSize="small" />, onClick: () => actions.move(item), disabled: busy },
              { key: 'delete', label: t('shell.common.delete'), icon: <DeleteIcon fontSize="small" />, onClick: () => actions.remove(item), disabled: busy, destructive: true },
            ]}
          />
        )}
      </ImageGrid>
    </Stack>
  );
}

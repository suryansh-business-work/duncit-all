import type { ComponentProps } from 'react';
import { Alert, ImageList } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import PexelsVideoCard from '../PexelsVideoCard';

type PexelsVideo = ComponentProps<typeof PexelsVideoCard>['video'];

interface Props {
  videos: PexelsVideo[];
  importingId: string | null;
  onPick: (video: PexelsVideo) => void;
}

/** The video grid, or the empty-results notice. */
export default function VideoResults({ videos, importingId, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  return videos.length === 0 ? (
    <Alert severity="info">{t('media.pexels.noVideos')}</Alert>
  ) : (
    <ImageList cols={3} gap={8} rowHeight={160} role="listbox" aria-label={t('media.picker.pexelsVideos')}>
      {videos.map((v) => (
        <PexelsVideoCard
          key={v.id}
          video={v}
          importing={importingId === v.id}
          anyImporting={!!importingId}
          onPick={onPick}
        />
      ))}
    </ImageList>
  );
}

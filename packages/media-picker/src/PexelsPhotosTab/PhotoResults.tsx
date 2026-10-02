import type { ComponentProps } from 'react';
import { Alert, ImageList } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import PexelsPhotoCard from '../PexelsPhotoCard';

type PexelsPhoto = ComponentProps<typeof PexelsPhotoCard>['photo'];

interface Props {
  photos: PexelsPhoto[];
  importingId: string | null;
  pickedIds: string[];
  multi?: boolean;
  atLimit?: boolean;
  onPick: (photo: PexelsPhoto) => void;
}

/** The photo grid, or the empty-results notice. */
export default function PhotoResults({ photos, importingId, pickedIds, multi, atLimit, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  return photos.length === 0 ? (
    <Alert severity="info">{t('media.pexels.noPhotos')}</Alert>
  ) : (
    <ImageList
      cols={3}
      gap={8}
      rowHeight={160}
      role="listbox"
      aria-label={t('media.picker.pexelsPhotos')}
      aria-multiselectable={multi}
    >
      {photos.map((p) => (
        <PexelsPhotoCard
          key={p.id}
          photo={p}
          importing={importingId === p.id}
          picked={pickedIds.includes(String(p.id))}
          // A full tray freezes the unpicked cards rather than letting a tap
          // do nothing and read as a broken grid.
          anyImporting={!!importingId || (!!atLimit && !pickedIds.includes(String(p.id)))}
          onPick={onPick}
        />
      ))}
    </ImageList>
  );
}

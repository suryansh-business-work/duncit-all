import { useMemo } from 'react';
import { Snackbar } from '@mui/material';
import { logs } from '@duncit/logs';
import ConfirmDialog from '../ConfirmDialog';
import HomeStatusViewer from '../../pages/home-page/HomeStatusViewer';
import AvatarButton from './AvatarButton';
import CropDialog from './CropDialog';
import PhotoActionMenu from './PhotoActionMenu';
import PhotoViewerDialog from './PhotoViewerDialog';
import { buildStoryViewerItem } from '../../pages/home-page/storyViewerItem';
import { useProfileAvatar } from './useProfileAvatar';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  photo?: string | null;
  name: string;
  size?: number;
  /** Refresh the host page after the photo or story changes. */
  onChanged?: () => void;
}

/**
 * The interactive profile avatar: story ring + tap-to-view, an edit pencil →
 * View / Change / Remove menu, crop dialog and the own-story viewer with a
 * delete action. Shared by mWeb's Account and Profile pages.
 *
 * It does not post stories. That entrance lives on Home, with the rest of the
 * status rail — see AvatarButton for why it was taken off the photo.
 */
export default function ProfileAvatar({ photo, name, size = 96, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const a = useProfileAvatar(onChanged, !!photo);
  const initial = (name?.[0] ?? 'U').toUpperCase();
  const storyItem = useMemo(
    () => buildStoryViewerItem(name, photo ?? null, a.stories),
    [name, photo, a.stories],
  );
  const deleteId = a.deleteId;

  return (
    <>
      <AvatarButton
        photo={photo}
        initial={initial}
        size={size}
        hasStory={a.hasStory}
        saving={a.saving}
        onAvatarClick={a.onAvatarClick}
        onEdit={a.openMenu}
      />

      <input
        ref={a.fileRef}
        type="file"
        accept="image/*"
        hidden
        data-testid="avatar-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          a.onFileChange(file).catch((error) => logs.mWeb.error('ProfileAvatar', 'onFileChange', { error }));
        }}
      />

      <PhotoActionMenu
        anchorEl={a.menuAnchor}
        hasPhoto={!!photo}
        onView={() => {
          a.closeMenu();
          a.setViewerOpen(true);
        }}
        onChange={a.pickFile}
        onRemove={() => {
          a.closeMenu();
          a.setRemoveOpen(true);
        }}
        onClose={a.closeMenu}
      />

      <PhotoViewerDialog open={a.viewerOpen} src={photo ?? null} onClose={() => a.setViewerOpen(false)} />

      <CropDialog
        open={!!a.cropSrc}
        src={a.cropSrc}
        saving={a.saving}
        onCancel={() => a.setCropSrc(null)}
        onConfirm={(dataUrl) => void a.saveCropped(dataUrl)}
      />

      <ConfirmDialog
        open={a.removeOpen}
        title={t('mweb.common.removePhoto2')}
        message={t('mweb.common.yourProfilePictureWillBeRemoved')}
        confirmLabel={t('mweb.common.remove')}
        destructive
        onConfirm={() => void a.confirmRemove()}
        onClose={() => a.setRemoveOpen(false)}
      />

      {a.storyOpen && storyItem ? (
        <HomeStatusViewer
          item={storyItem}
          onClose={() => a.setStoryOpen(false)}
          onDelete={a.setDeleteId}
        />
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        title={t('mweb.common.deleteStory')}
        message={t('mweb.common.thisStoryWillBeRemovedFor')}
        confirmLabel={t('mweb.common.delete')}
        destructive
        onConfirm={() => {
          if (deleteId)
            a.confirmDeleteStory(deleteId).catch((error) =>
              logs.mWeb.error('ProfileAvatar', 'confirmDeleteStory', { error, deleteId }),
            );
        }}
        onClose={() => a.setDeleteId(null)}
      />

      <Snackbar
        open={!!a.error}
        autoHideDuration={4000}
        onClose={() => a.setError(null)}
        message={a.error ?? ''}
      />
    </>
  );
}

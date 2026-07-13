import { useMemo } from 'react';
import { Snackbar } from '@mui/material';
import ConfirmDialog from '../ConfirmDialog';
import HomeStatusViewer from '../../pages/home-page/HomeStatusViewer';
import AvatarButton from './AvatarButton';
import CropDialog from './CropDialog';
import PhotoActionMenu from './PhotoActionMenu';
import PhotoViewerDialog from './PhotoViewerDialog';
import { buildOwnStoryItem } from './storyViewerItem';
import { useProfileAvatar } from './useProfileAvatar';

interface Props {
  photo?: string | null;
  name: string;
  size?: number;
  /** Refresh the host page after the photo or story changes. */
  onChanged?: () => void;
}

/** The interactive profile avatar (items 9 + 12): story ring + click-to-view/add,
 * an edit pencil → View / Change / Remove menu, crop dialog and the own-story
 * viewer with a delete action. Shared by mWeb's Account and Profile pages. */
export default function ProfileAvatar({ photo, name, size = 96, onChanged }: Readonly<Props>) {
  const a = useProfileAvatar(onChanged);
  const initial = (name?.[0] ?? 'U').toUpperCase();
  const storyItem = useMemo(
    () => buildOwnStoryItem(name, photo ?? null, a.stories),
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
        onAddStory={a.addStory}
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
          a.onFileChange(file).catch(console.error);
        }}
      />
      <input
        ref={a.storyFileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        data-testid="avatar-story-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          a.onStoryFileChange(file).catch(console.error);
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
        title="Remove photo?"
        message="Your profile picture will be removed."
        confirmLabel="Remove"
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
        title="Delete story?"
        message="This story will be removed for everyone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) a.confirmDeleteStory(deleteId).catch(console.error);
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

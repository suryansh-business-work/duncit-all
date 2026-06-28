import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_STORY,
  DELETE_STORY,
  MY_STORIES,
  UPDATE_PROFILE_PHOTO,
  UPLOAD_AVATAR_IMAGE,
} from './queries';

interface Story {
  id: string;
  image_url: string;
  media_type?: string | null;
  caption?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected image'));
    reader.readAsDataURL(file);
  });
}

/**
 * Photo + story state behind the mWeb profile avatar (items 9 + 12): the action
 * menu, photo viewer, crop dialog, remove confirm, story viewer and delete-story
 * confirm. Loads the user's own active stories so the ring + viewer reflect them.
 */
export function useProfileAvatar(onChanged?: () => void) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { data, refetch: refetchStories } = useQuery<{ myStories: Story[] }>(MY_STORIES, {
    fetchPolicy: 'cache-and-network',
  });
  const [uploadImage] = useMutation(UPLOAD_AVATAR_IMAGE);
  const [updatePhoto] = useMutation(UPDATE_PROFILE_PHOTO);
  const [createStory] = useMutation(CREATE_STORY);
  const [deleteStory] = useMutation(DELETE_STORY);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stories = data?.myStories ?? [];
  const hasStory = stories.length > 0;

  const openMenu = (el: HTMLElement) => setMenuAnchor(el);
  const closeMenu = () => setMenuAnchor(null);

  const pickFile = () => {
    closeMenu();
    fileRef.current?.click();
  };

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await toBase64(file);
    setCropSrc(dataUrl);
  };

  const saveCropped = async (dataUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      const uploaded = await uploadImage({
        variables: {
          fileBase64: dataUrl,
          fileName: `avatar-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          folder: '/users',
        },
      });
      const url = uploaded.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('Upload failed');
      await updatePhoto({ variables: { input: { profile_photo: url } } });
      setCropSrc(null);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update photo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    setRemoveOpen(false);
    setSaving(true);
    setError(null);
    try {
      await updatePhoto({ variables: { input: { profile_photo: null } } });
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove photo.');
    } finally {
      setSaving(false);
    }
  };

  const addStory = () => {
    closeMenu();
    storyFileRefClick();
  };

  const storyFileRef = useRef<HTMLInputElement | null>(null);
  const storyFileRefClick = () => storyFileRef.current?.click();

  const onStoryFileChange = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const base64 = await toBase64(file);
      const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      const uploaded = await uploadImage({
        variables: { fileBase64: base64, fileName: file.name, mimeType: file.type, folder: '/posts' },
      });
      const url = uploaded.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('Upload failed');
      await createStory({
        variables: { input: { image_url: url, caption: '', kind: 'STORY', media_type: mediaType } },
      });
      await refetchStories();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post story.');
    } finally {
      setSaving(false);
    }
  };

  const onAvatarClick = () => {
    if (hasStory) setStoryOpen(true);
    else storyFileRefClick();
  };

  const confirmDeleteStory = async (id: string) => {
    setDeleteId(null);
    await deleteStory({ variables: { id } });
    await refetchStories();
    setStoryOpen(false);
    onChanged?.();
  };

  return {
    fileRef,
    storyFileRef,
    stories,
    hasStory,
    menuAnchor,
    cropSrc,
    saving,
    viewerOpen,
    storyOpen,
    removeOpen,
    deleteId,
    error,
    openMenu,
    closeMenu,
    pickFile,
    onFileChange,
    saveCropped,
    setCropSrc,
    confirmRemove,
    setRemoveOpen,
    addStory,
    onStoryFileChange,
    onAvatarClick,
    setViewerOpen,
    setStoryOpen,
    setDeleteId,
    confirmDeleteStory,
    setError,
  };
}

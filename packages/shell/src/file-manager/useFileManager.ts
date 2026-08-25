import { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { DELETE_MEDIA_FILES, MEDIA_FILES, PAGE_SIZE, type MediaItem } from './queries';

/** Where the file manager's own uploads land, so they are findable later. */
const UPLOAD_FOLDER = '/file-manager';

/**
 * The file manager's state.
 *
 * Kept out of the dialog because there is a lot of it — a debounced search, a
 * page that has to reset when the search changes, a selection that has to
 * survive an upload but not a filter change — and each of those rules is easier
 * to see written down once than spread through JSX.
 */
export function useFileManager(open: boolean) {
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  const [deleteFiles] = useMutation<{ deleteMediaFiles: number }>(DELETE_MEDIA_FILES);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [fileType, setFileType] = useState('');
  const [sort, setSort] = useState('DESC_CREATED');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  // ImageKit charges per API call and a search box types fast.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Any change to what is being asked for starts at the first page again;
  // staying on page 4 of a different result set shows an empty grid.
  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [debounced, fileType, sort]);

  const { data, loading, error, refetch } = useQuery<{ mediaFiles: MediaItem[] }>(MEDIA_FILES, {
    variables: {
      search: debounced || null,
      fileType: fileType || null,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort,
    },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });

  const files = useMemo(() => data?.mediaFiles ?? [], [data]);
  // ImageKit pages by skip/limit and reports no total, so a full page is the
  // only signal that another one might exist.
  const hasMore = files.length === PAGE_SIZE;

  const toggle = useCallback((fileId: string) => {
    setSelected((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]
    );
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  const uploadFiles = useCallback(
    async (list: FileList) => {
      for (const file of Array.from(list)) {
        await upload(file, UPLOAD_FOLDER);
      }
      // A brand new file is not in ImageKit's list index instantly, so this is
      // a refetch rather than an optimistic insert — showing a tile that a
      // reload then loses would be worse than a moment's wait.
      await refetch();
    },
    [upload, refetch]
  );

  const removeSelected = useCallback(async () => {
    const gone = await deleteFiles({ variables: { fileIds: selected } });
    setSelected([]);
    await refetch();
    return gone.data?.deleteMediaFiles ?? 0;
  }, [deleteFiles, selected, refetch]);

  const removeOne = useCallback(
    async (fileId: string) => {
      const gone = await deleteFiles({ variables: { fileIds: [fileId] } });
      setSelected((current) => current.filter((id) => id !== fileId));
      await refetch();
      return gone.data?.deleteMediaFiles ?? 0;
    },
    [deleteFiles, refetch]
  );

  const copy = useCallback(async (url: string) => {
    await globalThis.navigator.clipboard.writeText(url);
  }, []);

  return {
    client,
    files,
    loading,
    error: error?.message ?? null,
    search,
    setSearch,
    fileType,
    setFileType,
    sort,
    setSort,
    page,
    setPage,
    hasMore,
    selected,
    toggle,
    clearSelection,
    uploading,
    uploadFiles,
    removeSelected,
    removeOne,
    copy,
    refetch,
  };
}

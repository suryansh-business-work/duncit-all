import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  CREATE_IDEA,
  DELETE_IDEA,
  POD_IDEAS,
  SHARE,
  TOGGLE_LIKE,
} from '../queries';
import type { CategoryScope } from '../CategoryCascade';
import { ideaMatchesScope } from '../../../utils/ideaCategory';
import { shareUrl } from '../../../lib/share-link';
import type { Translate } from '../../../i18n/fallback';

/** The approved ideas, the viewer's own pending ideas (both scoped by the
 * category filter), the idea mutations and the like/share actions. */
export function usePodIdeasData(
  search: string,
  filterScope: CategoryScope,
  setToast: (message: string | null) => void,
  t: Translate
) {
  const filter = useMemo(() => {
    const f: any = { status: 'APPROVED' };
    if (search.trim()) f.search = search.trim();
    return f;
  }, [search]);

  const { data, loading, refetch } = useQuery<any>(POD_IDEAS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const ideas: any[] = data?.podIdeas ?? [];
  const me = data?.me;
  const myId = me?.user_id;

  const { data: myData, refetch: refetchMine } = useQuery<any>(POD_IDEAS, {
    variables: { filter: { author_id: myId } },
    skip: !myId,
    fetchPolicy: 'cache-and-network',
  });
  const myIdeas: any[] = (myData?.podIdeas ?? []).filter(
    (i: any) => i.status !== 'APPROVED'
  );

  const visibleIdeas = useMemo(
    () => ideas.filter((i) => ideaMatchesScope(i, filterScope)),
    [ideas, filterScope]
  );
  const visibleMyIdeas = useMemo(
    () => myIdeas.filter((i) => ideaMatchesScope(i, filterScope)),
    [myIdeas, filterScope]
  );

  const [createMut, { loading: creating }] = useMutation<any>(CREATE_IDEA);
  const [toggleLikeMut] = useMutation<any>(TOGGLE_LIKE);
  const [shareMut] = useMutation<any>(SHARE);
  const [deleteMut] = useMutation<any>(DELETE_IDEA);

  const refetchAll = async () => {
    await Promise.all([refetch(), myId ? refetchMine() : Promise.resolve()]);
  };

  const toggleLike = async (id: string) => {
    try {
      await toggleLikeMut({ variables: { id } });
    } catch (e: any) {
      setToast(e.message);
    }
  };

  const share = async (idea: any) => {
    const url = await shareUrl(
      'POD_IDEA',
      idea.id,
      `${globalThis.window.location.origin}/pod-ideas?id=${idea.id}`,
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: idea.title, text: idea.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast(t('mweb.podIdeas.linkCopiedToClipboard'));
      }
      await shareMut({ variables: { id: idea.id } });
      await refetch();
    } catch {
      /* user cancelled */
    }
  };

  return {
    data,
    loading,
    me,
    myId,
    visibleIdeas,
    visibleMyIdeas,
    createMut,
    creating,
    deleteMut,
    refetchAll,
    toggleLike,
    share,
  };
}

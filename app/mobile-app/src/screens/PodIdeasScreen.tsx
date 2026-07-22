import { useMemo, useState } from 'react';
import { Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import {
  CategoryCascadeField,
  EMPTY_CATEGORY_SCOPE,
  IdeaComposerSheet,
  IdeaDeleteConfirm,
  IdeaDetailsSheet,
  IdeasList,
  type CategoryScope,
} from '@/components/pod-ideas';
import { usePodIdeas, type PodIdea } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ideaMatchesScope } from '@/utils/idea-category';

/** Pod Ideas board — searchable community ideas with submit, like, share and a
 * comment thread. RN port of mWeb's PodIdeasPage. */
export function PodIdeasScreen() {
  const { muted, onPrimary } = useThemeColors();
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<CategoryScope>(EMPTY_CATEGORY_SCOPE);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    ideas,
    myIdeas,
    myId,
    hasData,
    isLoading,
    refetch,
    create,
    toggleLike,
    share,
    deleteIdea,
  } = usePodIdeas(search);

  const visibleIdeas = useMemo(
    () => ideas.filter((i) => ideaMatchesScope(i, filterScope)),
    [ideas, filterScope],
  );
  const visibleMyIdeas = useMemo(
    () => myIdeas.filter((i) => ideaMatchesScope(i, filterScope)),
    [myIdeas, filterScope],
  );

  const onShareIdea = async (idea: PodIdea) => {
    try {
      await Share.share({ message: `${idea.title}\n\n${idea.description}`, title: idea.title });
      await share(idea.id);
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const performDelete = async () => {
    /* istanbul ignore next -- the confirm dialog only opens with an id set */
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteIdea(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch {
      /* keep the confirm open so the user can retry */
    } finally {
      setDeleting(false);
    }
  };

  const shareButton = (
    <XStack
      testID="pod-ideas-add"
      role="button"
      aria-label="Share an idea"
      onPress={() => setComposerOpen(true)}
      alignItems="center"
      gap={5}
      paddingHorizontal={12}
      height={36}
      borderRadius={999}
      backgroundColor="$primary"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="add" size={16} color={onPrimary} />
      <Text fontSize={13} fontWeight="900" color={onPrimary}>
        Share
      </Text>
    </XStack>
  );

  return (
    <StackScreen title="Pod Ideas" testID="pod-ideas-screen" right={shareButton}>
      <XStack
        alignItems="center"
        gap={8}
        margin={16}
        marginBottom={4}
        paddingHorizontal={12}
        height={44}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={18} color={muted} />
        <Input
          testID="pod-ideas-search"
          aria-label="Search pod ideas"
          flex={1}
          unstyled
          value={search}
          onChangeText={setSearch}
          placeholder="Search ideas…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={14}
        />
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}>
        <CategoryCascadeField
          value={filterScope}
          onChange={setFilterScope}
          allowAll
          idPrefix="idea-filter-cat"
        />
        <IdeasList
          isLoading={isLoading}
          hasData={hasData}
          ideas={visibleIdeas}
          myIdeas={visibleMyIdeas}
          myId={myId}
          onOpen={setDetailsId}
          onLike={toggleLike}
          onShare={onShareIdea}
          onDelete={setConfirmDeleteId}
        />
      </ScrollView>

      <IdeaComposerSheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={create}
      />

      {detailsId ? (
        <IdeaDetailsSheet
          id={detailsId}
          myId={myId}
          onClose={() => setDetailsId(null)}
          onChanged={refetch}
        />
      ) : null}

      <IdeaDeleteConfirm
        open={!!confirmDeleteId}
        busy={deleting}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={performDelete}
      />
    </StackScreen>
  );
}

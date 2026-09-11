import { useCallback, useMemo, type ReactElement } from 'react';
import { FlatList, Platform, type ListRenderItemInfo } from 'react-native';
import { YStack } from 'tamagui';
import type { InvitableContact } from '@duncit/utils';

import { ContactRow } from '@/components/contacts/ContactRow';
import { InviteRow } from '@/components/contacts/InviteRow';
import { useScreenRefreshControl } from '@/components/PullToRefresh';
import type { ContactRow as ContactRowData } from '@/hooks/useContacts';

/** A row of either list: a matched contact, or a number to invite. */
export type FeedRow = ContactRowData | InvitableContact;

const keyOf = (row: FeedRow): string => ('profile' in row ? row.profile.user_id : row.phone_key);

const CONTENT_STYLE = { paddingBottom: 32 };
/** The rows read as one card: surface cells, the first and last rounded. */
const CARD_RADIUS = 24;

/** A hairline between two rows, inset past the avatar, on the card's fill. */
function Separator() {
  return (
    <YStack marginHorizontal={16} backgroundColor="$surface">
      <YStack height={1} marginLeft={72} backgroundColor="$borderColor" />
    </YStack>
  );
}

interface Props {
  rows: readonly FeedRow[];
  /** Everything above the rows — it scrolls away with them. */
  header: ReactElement;
  empty: ReactElement;
  footer: ReactElement | null;
  busyId: string | null;
  onToggleFollow: (row: ContactRowData) => void;
  onOpen: (userId: string) => void;
  selected: readonly string[];
  busyKey: string | null;
  onToggleSelect: (key: string) => void;
  onInvite: (key: string) => void;
}

/**
 * The screen's one scroll surface: a virtualised list holding either the
 * matched contacts or the numbers to invite, with the radar, filters and sync
 * card as its header. Only the rows near the viewport are mounted, so a phone
 * book of thousands scrolls like one of ten — and switching tabs swaps the
 * data, never the list, so the search box keeps its focus. mWeb windows the
 * same rows with `useVirtualRows` (rule 27).
 */
export function ContactsFeed({
  rows,
  header,
  empty,
  footer,
  busyId,
  onToggleFollow,
  onOpen,
  selected,
  busyKey,
  onToggleSelect,
  onInvite,
}: Readonly<Props>) {
  const refreshControl = useScreenRefreshControl();
  const selectedKeys = useMemo(() => new Set(selected), [selected]);

  const lastIndex = rows.length - 1;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FeedRow>) => (
      <YStack
        marginHorizontal={16}
        backgroundColor="$surface"
        overflow="hidden"
        borderTopLeftRadius={index === 0 ? CARD_RADIUS : 0}
        borderTopRightRadius={index === 0 ? CARD_RADIUS : 0}
        borderBottomLeftRadius={index === lastIndex ? CARD_RADIUS : 0}
        borderBottomRightRadius={index === lastIndex ? CARD_RADIUS : 0}
      >
        {'profile' in item ? (
          <ContactRow
            row={item}
            busy={busyId === item.profile.user_id}
            onToggleFollow={onToggleFollow}
            onOpen={onOpen}
          />
        ) : (
          <InviteRow
            row={item}
            selected={selectedKeys.has(item.phone_key)}
            busy={busyKey === item.phone_key}
            onToggleSelect={onToggleSelect}
            onInvite={onInvite}
          />
        )}
      </YStack>
    ),
    [busyId, busyKey, selectedKeys, lastIndex, onToggleFollow, onOpen, onToggleSelect, onInvite],
  );

  return (
    <FlatList
      testID="contacts-feed"
      data={rows}
      keyExtractor={keyOf}
      renderItem={renderItem}
      // A tick or a spinner changes a row without changing the data array.
      extraData={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={CONTENT_STYLE}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={50}
      windowSize={9}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
}

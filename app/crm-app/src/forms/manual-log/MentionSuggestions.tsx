import { useMemo } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { CrmAppMentionSearchDocument } from '@/graphql/leadTabsB';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { useDebouncedValue } from '@/screens/lead/tabs/TabsBDebounce';
import type { LogMention } from '@/screens/lead/tabs/ManualLogsHtml';

/** How many teammates the list offers — the portal editor's eight. */
const MENTION_LIMIT = 8;

interface Props {
  /** What was typed after "@" ('' right after it). */
  query: string;
  onPick: (person: LogMention) => void;
}

/** The CRM teammates matching a half-typed @mention; picking one tags them (they are emailed on save). */
export function MentionSuggestions({ query, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useDebouncedValue(query);
  const variables = useMemo(() => ({ search: search || null, limit: MENTION_LIMIT }), [search]);
  const { data, loading, error } = useGqlQuery(CrmAppMentionSearchDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const people = data?.crmAssignableUsers ?? [];
  if (loading && !data) return <Spinner color="$accentText" />;
  if (error) return <Text color="$danger">{error}</Text>;
  if (people.length === 0) return null;
  return (
    <YStack {...SURFACE} padding="$1" gap="$1" role="list" testID="mention-list">
      {people.map((person) => {
        const label = person.name || person.email || person.id;
        return (
          <YStack
            key={person.id}
            role="button"
            aria-label={label}
            onPress={() => onPick({ id: person.id, label })}
            paddingHorizontal="$2"
            paddingVertical="$2"
            minHeight={44}
            testID={`mention-${person.id}`}
          >
            <Text fontWeight="600">{label}</Text>
            {person.email ? (
              <Text color="$muted" fontSize="$2">
                {person.email}
              </Text>
            ) : null}
          </YStack>
        );
      })}
    </YStack>
  );
}

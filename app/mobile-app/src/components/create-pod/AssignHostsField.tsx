import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FieldLabel } from '@/components/Field';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodHostOption } from './create-pod.types';

/** One assigned host — tap to take them off the pod. */
function HostChip({
  host,
  removeLabel,
  onRemove,
}: Readonly<{ host: PodHostOption; removeLabel: string; onRemove: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID={`create-pod-host-chip-${host.user_id}`}
      role="button"
      aria-label={removeLabel}
      onPress={onRemove}
      alignItems="center"
      gap={4}
      paddingHorizontal={12}
      paddingVertical={7}
      borderRadius={999}
      backgroundColor="$primary"
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={12.5} fontWeight="600" color="$onPrimary">
        {host.full_name}
      </Text>
      <MaterialIcons name="close" size={14} color={onPrimary} />
    </XStack>
  );
}

interface Props {
  hosts: PodHostOption[];
  onChange: (next: PodHostOption[]) => void;
  /** Server-backed search over the approved hosts the club admin may assign. */
  search: (term: string) => Promise<PodHostOption[]>;
}

/**
 * The Club Admin's optional assign-hosts picker — the Tamagui twin of the
 * shared pod form's hosts field (rule 27). Left empty, the server puts the
 * club admin on the pod as its host.
 */
export function AssignHostsField({ hosts, onChange, search }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query.trim());
  const [results, setResults] = useState<PodHostOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!term) {
      setResults([]);
      return undefined;
    }
    let active = true;
    setIsSearching(true);
    search(term)
      .then((rows) => active && setResults(rows))
      .catch(() => active && setResults([]))
      .finally(() => active && setIsSearching(false));
    return () => {
      active = false;
    };
  }, [term, search]);

  const chosen = new Set(hosts.map((host) => host.user_id));
  const add = (host: PodHostOption) => {
    onChange([...hosts, host]);
    setQuery('');
    setResults([]);
  };
  const label = t('mweb.studioPods.hosts');

  return (
    <YStack gap={8} testID="create-pod-hosts">
      <FieldLabel label={label} testID="create-pod-hosts" />
      <Text fontSize={12} color="$muted">
        {t('clubAdmin.editor.hostNote')}
      </Text>
      {hosts.length > 0 ? (
        <XStack gap={6} flexWrap="wrap">
          {hosts.map((host) => (
            <HostChip
              key={host.user_id}
              host={host}
              removeLabel={t('mweb.createPod.removeTag', { vars: { tag: host.full_name } })}
              onRemove={() => onChange(hosts.filter((item) => item.user_id !== host.user_id))}
            />
          ))}
        </XStack>
      ) : null}
      <Input
        testID="create-pod-hosts-search"
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor="$borderColor"
        value={query}
        onChangeText={setQuery}
        placeholder={t('mweb.common.search')}
        aria-label={label}
      />
      {isSearching ? <Spinner testID="create-pod-hosts-searching" color="$primary" /> : null}
      {results
        .filter((host) => !chosen.has(host.user_id))
        .map((host) => (
          <XStack
            key={host.user_id}
            testID={`create-pod-host-${host.user_id}`}
            role="button"
            aria-label={host.full_name}
            onPress={() => add(host)}
            alignItems="center"
            gap={10}
            padding={12}
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.control}
          >
            <YStack flex={1}>
              <Text fontSize={13.5} fontWeight="600" color="$color">
                {host.full_name}
              </Text>
              {host.email ? (
                <Text fontSize={12} color="$muted">
                  {host.email}
                </Text>
              ) : null}
            </YStack>
            <MaterialIcons name="add" size={18} color={muted} />
          </XStack>
        ))}
    </YStack>
  );
}

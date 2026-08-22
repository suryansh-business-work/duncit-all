import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import {
  buildUsernameLabels,
  canSaveUsername,
  isUsernameError,
  normalizeUsername,
  profileUrl,
  usernameStatus,
} from '@duncit/utils';

import { useSaveUsername, useUsernameCheck } from '@/hooks/useUsername';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_WEB_BASE } from '@/utils/pod-format';

interface Props {
  /** The handle the account has now, or null for one that predates handles. */
  current: string | null;
  onSaved: () => void | Promise<void>;
}

/**
 * Profile Settings → Username. Tamagui twin of mWeb's UsernameForm (rule 27).
 *
 * The field shows the LINK it produces rather than describing it — that link is
 * the only reason anybody opens this section, and it is what they came to copy.
 */
export function UsernameSection({ current, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, primary, danger } = useThemeColors();
  const labels = buildUsernameLabels(t);
  const [typed, setTyped] = useState(current ?? '');
  const [copied, setCopied] = useState(false);

  const value = normalizeUsername(typed);
  const check = useUsernameCheck(value, current);
  const status = usernameStatus({
    value,
    current,
    checking: check.checking,
    available: check.available,
    reason: check.reason,
  });
  const save = useSaveUsername(onSaved);

  // The link previews the handle being typed once it is usable, and otherwise
  // the one that works today. Hoisted so the branch sits at nesting zero.
  const linkHandle = canSaveUsername(status) ? value : current;
  const link = linkHandle ? profileUrl(POD_WEB_BASE, linkHandle) : '';
  const statusLine = labels.status(status, value);
  const statusColor = isUsernameError(status) ? danger : muted;
  const saveable = canSaveUsername(status) && !save.saving;

  const copyLink = () => {
    Clipboard.setStringAsync(link)
      .then(() => setCopied(true))
      .catch((error) => logs.mobileApp.warn('UsernameSection', 'copyLink', { error }));
  };

  return (
    <YStack
      testID="username-section"
      gap={10}
      padding={16}
      borderRadius={18}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <YStack gap={2}>
        <Text fontSize={15} fontWeight="800" color="$color">
          {labels.title}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {labels.subtitle}
        </Text>
      </YStack>

      {save.saveFailed ? (
        <Text testID="username-save-failed" fontSize={12.5} color={danger}>
          {labels.saveFailed}
        </Text>
      ) : null}

      <XStack alignItems="center" gap={8}>
        <Input
          testID="username-input"
          flex={1}
          value={typed}
          onChangeText={setTyped}
          placeholder={labels.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          aria-label={labels.label}
        />
        {check.checking ? <ActivityIndicator testID="username-checking" color={primary} /> : null}
        {status === 'AVAILABLE' ? (
          <MaterialIcons name="check-circle-outline" size={20} color={primary} />
        ) : null}
      </XStack>

      {statusLine ? (
        <Text testID="username-status" fontSize={12.5} color={statusColor}>
          {statusLine}
        </Text>
      ) : null}

      {link ? (
        <YStack gap={4}>
          <Text fontSize={11.5} color="$muted">
            {labels.linkLabel}
          </Text>
          <XStack alignItems="center" gap={8}>
            <Text flex={1} fontSize={13} color="$color" numberOfLines={2}>
              {link}
            </Text>
            <Button
              testID="username-copy"
              size="$2"
              chromeless
              icon={<MaterialIcons name="content-copy" size={16} color={primary} />}
              onPress={copyLink}
            >
              {labels.copyLink}
            </Button>
          </XStack>
          {copied ? (
            <Text testID="username-link-copied" fontSize={11.5} color={primary}>
              {labels.linkCopied}
            </Text>
          ) : null}
        </YStack>
      ) : null}

      <Button
        testID="username-save"
        theme="active"
        disabled={!saveable}
        opacity={saveable ? 1 : 0.5}
        icon={save.saving ? <ActivityIndicator color={primary} /> : undefined}
        onPress={() => {
          save.save(value).catch(() => {
            /* reported through save.saveFailed */
          });
        }}
      >
        {labels.save}
      </Button>

      {save.saved ? (
        <Text testID="username-saved" fontSize={12.5} color={primary}>
          {labels.saved}
        </Text>
      ) : null}
    </YStack>
  );
}

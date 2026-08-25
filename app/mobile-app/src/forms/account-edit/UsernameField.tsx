import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  buildUsernameLabels,
  canSaveUsername,
  isUsernameError,
  normalizeUsername,
  profileUrl,
  usernameStatus,
  type UsernameStatus,
} from '@duncit/utils';

import { Field } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useUsernameCheck } from '@/hooks/useUsername';
import { POD_WEB_BASE } from '@/utils/pod-format';
import type { AccountEditValues } from './account-edit.types';

export interface UsernameFieldProps {
  /** react-hook-form control from Edit profile's `useForm`. */
  control: Control<AccountEditValues>;
  /** The handle the account has now, or null for one that predates handles. */
  current: string | null;
  /** Hands the decided status back so Save can be gated on it. */
  onStatusChange: (status: UsernameStatus) => void;
}

/**
 * Edit profile → Username. Tamagui twin of mWeb's <UsernameField/> (rule 27).
 *
 * The field shares the sheet's Save: a handle that is half-typed, taken or
 * still being checked disables it, so the only handle that can reach the server
 * is one the server has just said yes to. Underneath it renders the LINK the
 * handle produces rather than describing it — seeing the new address before
 * saving is what makes the warning about already-shared links land.
 */
export function UsernameField({ control, current, onStatusChange }: Readonly<UsernameFieldProps>) {
  const { t } = useTranslation();
  const { muted, primary } = useThemeColors();
  const labels = buildUsernameLabels(t);
  const { field } = useController({ control, name: 'username' });

  const typed = normalizeUsername(field.value);
  const check = useUsernameCheck(typed, current);
  const status = usernameStatus({
    value: typed,
    current,
    checking: check.checking,
    available: check.available,
    reason: check.reason,
  });

  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);

  // The link previews the handle being typed once it is usable, and otherwise
  // the one that works today. Hoisted so the branch sits at nesting zero.
  const linkHandle = canSaveUsername(status) ? typed : current;
  const link = linkHandle ? profileUrl(POD_WEB_BASE, linkHandle) : '';
  const statusLine = labels.status(status, typed);
  const errored = isUsernameError(status);

  return (
    <YStack gap={6}>
      <Field
        label={labels.label}
        hint={statusLine || labels.hint}
        testID="username"
        error={errored ? statusLine : undefined}
      >
        <XStack alignItems="center" gap={8}>
          <Input
            testID="field-username"
            flex={1}
            size="$4"
            backgroundColor="$surface"
            color="$color"
            placeholderTextColor="$muted"
            borderColor={errored ? '$danger' : '$borderColor'}
            focusStyle={{ borderColor: errored ? '$danger' : '$primary', borderWidth: 1.5 }}
            value={typed}
            onChangeText={(text) => field.onChange(normalizeUsername(text))}
            onBlur={field.onBlur}
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
      </Field>

      {link ? (
        <YStack gap={2}>
          <Text fontSize={11.5} color={muted}>
            {labels.linkLabel}
          </Text>
          <Text
            testID="username-link-preview"
            fontSize={13}
            fontWeight="600"
            color="$color"
            numberOfLines={2}
          >
            {link}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}

import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import { useProfileBlock } from '@/hooks/useProfileBlock';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const ID = 'public-profile-actions';

interface TriggerProps {
  open: boolean;
  busy: boolean;
  busyLabel: string;
  onPress: () => void;
}

/**
 * The 3-dot button in the profile's header bar. Turns into a spinner while a
 * block is going through, so a second tap cannot race the first.
 */
export function ProfileActionsTrigger({ open, busy, busyLabel, onPress }: Readonly<TriggerProps>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  return (
    <XStack
      testID={`${ID}-trigger`}
      role="button"
      tabIndex={0}
      aria-label={busy ? busyLabel : t('contentReport.profileMenuLabel')}
      aria-expanded={open}
      aria-busy={busy}
      disabled={busy}
      onPress={onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner testID={`${ID}-busy`} color="$color" />
      ) : (
        <MaterialIcons name="more-vert" size={20} color={color} />
      )}
    </XStack>
  );
}

/** What the profile says about a block: that one is in force, or that one failed. */
export function ProfileBlockNotices({ blocked, error }: Readonly<{ blocked: boolean; error: string }>) {
  const { t } = useTranslation();
  return (
    <>
      {blocked ? (
        <Text testID="public-profile-blocked" role="status" fontSize={14} color="$muted" textAlign="center">
          {t('contentReport.blockedNotice')}
        </Text>
      ) : null}
      {error ? (
        <Text testID="public-profile-block-error" role="alert" fontSize={13} color="$danger" textAlign="center">
          {error}
        </Text>
      ) : null}
    </>
  );
}

interface ItemProps {
  testID: string;
  label: string;
  icon: 'block' | 'check-circle-outline' | 'flag';
  danger?: boolean;
  onPress: () => void;
}

function MenuRow({ testID, label, icon, danger = false, onPress }: Readonly<ItemProps>) {
  const colors = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="menuitem"
      tabIndex={0}
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={8}
      minHeight={44}
      paddingHorizontal={16}
      paddingVertical={12}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons name={icon} size={18} color={danger ? colors.danger : colors.color} />
      <Text fontSize={14} fontWeight="600" color={danger ? '$danger' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface MenuProps {
  block: ReturnType<typeof useProfileBlock>;
  userId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Block (or Unblock) and Report for somebody else's profile, the confirm in
 * front of a block, and the report sheet. mWeb twin: ProfileActionsMenu
 * (rule 27). Rendered at the top of the screen's body, under the header bar
 * whose trigger opens it — a menu hung off the header row itself would not
 * receive taps on Android.
 */
export function ProfileActionsMenu({ block, userId, open, onClose }: Readonly<MenuProps>) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState<string | null>(null);
  const isBlock = block.action === 'BLOCK';

  return (
    <>
      {open ? (
        <YStack
          testID={ID}
          role="menu"
          position="absolute"
          top={4}
          right={16}
          zIndex={20}
          backgroundColor="$surface"
          borderRadius={14}
          borderWidth={1}
          borderColor="$borderColor"
          overflow="hidden"
        >
          <MenuRow
            testID={`${ID}-block`}
            label={t(block.copy.menu)}
            icon={isBlock ? 'block' : 'check-circle-outline'}
            danger={isBlock}
            onPress={() => {
              onClose();
              block.ask();
            }}
          />
          <MenuRow
            testID={`${ID}-report`}
            label={t('contentReport.reportProfile')}
            icon="flag"
            onPress={() => {
              onClose();
              setReporting(userId);
            }}
          />
        </YStack>
      ) : null}
      <ConfirmDialog
        open={block.confirming}
        testID={`${ID}-confirm`}
        title={t(block.copy.confirmTitle, { vars: { name: block.name } })}
        message={t(block.copy.confirmBody)}
        confirmLabel={t(block.copy.menu)}
        destructive={isBlock}
        busy={block.busy}
        onConfirm={() => {
          fireAndForget(block.confirm());
        }}
        onCancel={block.cancel}
      />
      <ReportContentSheet kind="PROFILE" targetId={reporting} onClose={() => setReporting(null)} />
    </>
  );
}

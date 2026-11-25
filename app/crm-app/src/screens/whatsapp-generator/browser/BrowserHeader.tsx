import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { TabBar } from '@/components/TabBar';
import { RADII } from '@/constants/design';
import { useWaExtraction } from '@/features/whatsapp-generator/extractionStore';
import { WA_TABS, type WaBrowser, type WaTab } from '@/features/whatsapp-generator/useWaBrowser';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';

const TAB_LABEL_KEY: Record<WaTab, string> = {
  communities: 'crm.common.communities',
  groups: 'crm.common.groups',
  users: 'crm.tools.users',
};

/** The community the Groups list is narrowed to, with a way back to every group. */
function CommunityChip({ name, onClear }: Readonly<{ name: string; onClear: () => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      gap="$1"
      paddingLeft="$3"
      borderRadius={RADII.pill}
      backgroundColor="$soft"
      testID="wa-community-chip"
    >
      <Text fontSize="$2" fontWeight="600">
        {t('crm.tools.communityFilter', { vars: { name } })}
      </Text>
      <XStack
        role="button"
        aria-label={t('shell.common.clear')}
        onPress={onClear}
        padding="$2"
        hitSlop={6}
        testID="wa-community-clear"
      >
        <MaterialIcons name="cancel" size={18} color={theme.muted?.val} />
      </XStack>
    </XStack>
  );
}

/**
 * Above the browser list: the Communities / Groups / Users tabs, Extract, the
 * server-side search, the community filter and the extraction notice.
 */
export function BrowserHeader({ browser }: Readonly<{ browser: WaBrowser }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const running = useWaExtraction((s) => s.job?.status === 'RUNNING');
  const starting = useWaExtraction((s) => s.starting);
  const error = useWaExtraction((s) => s.error);
  const { tab, community, list } = browser;
  const extract = () =>
    fireAndForget(
      useWaExtraction.getState().start(t('crmApp.common.saveFailed')),
      logs.mobileApp,
      'crm-app/WhatsAppBrowser',
      'startExtraction',
    );

  return (
    <YStack gap="$3" marginBottom="$1">
      <TabBar
        tabs={WA_TABS.map((key) => ({ key, label: t(TAB_LABEL_KEY[key]) }))}
        active={tab}
        onChange={(key) => {
          const next = WA_TABS.find((k) => k === key);
          if (next) browser.setTab(next);
        }}
        testID="wa-tab"
      />
      <DuncitButton
        label={running ? t('crm.tools.extracting') : t('crm.tools.extract')}
        icon={<MaterialIcons name="bolt" size={18} color={theme.accentText?.val} />}
        onPress={extract}
        variant="outline"
        loading={starting}
        disabled={running}
        fullWidth
        testID="wa-extract"
      />
      <Input
        value={browser.search}
        onChangeText={browser.setSearch}
        placeholder={t('shell.table.search')}
        aria-label={t('shell.table.search')}
        placeholderTextColor="$muted"
        borderColor="$inputBorder"
        autoCorrect={false}
        testID="wa-search"
      />
      {tab === 'groups' && community ? (
        <CommunityChip name={community.name} onClear={browser.clearCommunity} />
      ) : null}
      {error ? <AuthAlert message={error} testID="wa-extract-error" /> : null}
      {running ? (
        <Text
          role="status"
          aria-live="polite"
          color="$info"
          backgroundColor="$infoSoft"
          borderRadius={RADII.sm}
          padding="$3"
          testID="wa-extract-running"
        >
          {t('crm.tools.extractionInProgressDataUpdatesAutomatically')}
        </Text>
      ) : null}
      {list.total > 0 ? (
        <Text color="$muted" fontSize="$2" aria-live="polite">
          {t('crmApp.whatsappGenerator.results', { count: list.total })}
        </Text>
      ) : null}
    </YStack>
  );
}

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { PageHeading } from '@/components/club-admin/PageHeading';
import { CreatePodStepper, type ClubAdminStepperMode } from '@/components/create-pod';
import { useClubAdminPodEditor } from '@/hooks/useClubAdminPodEditor';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

type EditorRoute = RouteProp<RootStackParamList, 'ClubPodEditor' | 'ClubPodEdit'>;

/** Fallbacks keep the pricing panel rendering while settings load. */
const BLANK_FINANCE = { platform_fee_pct: 0, gst_pct: 0, currency_symbol: '₹' };

/** The host flow's draft hooks, which Club Admin mode never reaches — the
 * stepper writes through `clubAdmin.submit` instead. */
const noDraft = async () => '';
const noPublish = async () => undefined;

/**
 * The Club Admin's pod editor — /clubs/:clubId/pods/new and
 * /clubs/:clubId/pods/:podId/edit, the twin of mWeb's `PodEditorPage` over
 * `useClubAdminPodEditor` (rule 27). It is the host's Create Pod stepper in
 * Club Admin mode: the club pinned, no draft, an optional assign-hosts field,
 * and the last step writing through the club-admin mutations. A save lands
 * back on the club's pods with a notice.
 */
export function ClubPodEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<EditorRoute>();
  const { clubId } = params;
  const podId = 'podId' in params ? params.podId : undefined;
  const editor = useClubAdminPodEditor(clubId, podId);
  const { club, options } = editor;
  const title = podId ? t('clubAdmin.pods.editPod') : t('clubAdmin.pods.newPod');

  const mode: ClubAdminStepperMode | null = club
    ? {
        club,
        initialHosts: editor.initialHosts,
        searchHosts: editor.searchHosts,
        submitLabel: podId ? t('mweb.hostManage.saveChanges') : t('mweb.createPod.createPod'),
        busyLabel: podId ? t('mweb.hostPodActions.saving') : t('mweb.createPod.creating'),
        submit: async (input, hostIds) => {
          const notice = await editor.submit(input, hostIds);
          navigation.popTo('ClubPods', { clubId, notice });
        },
      }
    : null;

  return (
    <StackScreen title={title} testID="club-pod-editor-screen">
      {editor.isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="club-pod-editor-loading" color="$primary" />
        </YStack>
      ) : null}
      {editor.hasError ? (
        <YStack padding={16}>
          <LoadErrorNotice testID="club-pod-editor-error" onRetry={editor.refetch} />
        </YStack>
      ) : null}
      {editor.notFound ? (
        <Text testID="club-pod-editor-not-found" padding={16} fontSize={13} color="$muted">
          {t('clubAdmin.editor.notFound')}
        </Text>
      ) : null}
      {club && options && mode ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack paddingHorizontal={16} paddingTop={12}>
            <PageHeading
              eyebrow={t('clubAdmin.editor.eyebrow', { vars: { club: club.club_name } })}
              title={title}
            />
          </YStack>
          <CreatePodStepper
            initialValues={editor.initialValues}
            initialStep={0}
            initialDraftId={null}
            clubs={[club]}
            locations={options.locations ?? []}
            venues={(options.publicVenues ?? []).filter((venue) => venue.is_active !== false)}
            products={options.availablePodProducts ?? []}
            subCategories={options.subCategories ?? []}
            hostCategories={[]}
            viewerUserId={editor.viewerUserId}
            finance={options.publicFinanceSettings ?? BLANK_FINANCE}
            onSaveDraft={noDraft}
            onModerate={editor.moderate}
            onPublish={noPublish}
            clubAdmin={mode}
          />
        </ScrollView>
      ) : null}
    </StackScreen>
  );
}

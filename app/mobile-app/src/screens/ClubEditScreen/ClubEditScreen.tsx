import { useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { PageHeading } from '@/components/club-admin/PageHeading';
import { ClubEditForm } from '@/components/club-admin/club-edit/ClubEditForm';
import {
  buildClubEditInput,
  clubToEditValues,
  type ClubEditFormValues,
} from '@/components/club-admin/club-edit/club-edit.form';
import { useClubEdit } from '@/hooks/useClubEdit';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Edit Club Details — the twin of mWeb's /clubs/:clubId/edit (rule 27): the
 * club's own page, saved through `clubAdminUpdateClub` with the same input the
 * shared club form builds under the partner config.
 */
export function ClubEditScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClubEdit'>>();
  const { clubId } = params;
  const { club, isLoading, hasError, notFound, refetch, save } = useClubEdit(clubId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const initialValues = useMemo(() => (club ? clubToEditValues(club) : null), [club]);

  const submit = async (values: ClubEditFormValues) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await save(buildClubEditInput(values));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('mweb.clubEdit.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StackScreen title={t('mweb.meta.clubEdit.title')} testID="club-edit-screen">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack gap={14} padding={16} paddingBottom={48}>
          <PageHeading
            eyebrow={t('clubAdmin.editClub.eyebrow')}
            title={t('clubAdmin.editClub.title')}
            subtitle={club?.club_name}
          />
          <Text
            testID="club-edit-back-to-pods"
            role="button"
            aria-label={t('clubAdmin.editClub.backToPods')}
            onPress={() => navigation.navigate('ClubPods', { clubId })}
            pressStyle={PRESS_STYLE.inline}
            fontSize={13}
            fontWeight="700"
            color="$primary"
          >
            {t('clubAdmin.editClub.backToPods')}
          </Text>
          {isLoading ? <Spinner testID="club-edit-loading" color="$primary" /> : null}
          {hasError ? <LoadErrorNotice testID="club-edit-error" onRetry={refetch} /> : null}
          {notFound ? (
            <Text testID="club-edit-not-found" fontSize={13} color="$muted">
              {t('clubAdmin.editClub.notFound')}
            </Text>
          ) : null}
          {saved ? (
            <Text testID="club-edit-saved" fontSize={12.5} color="$success">
              {t('clubAdmin.editClub.saved')}
            </Text>
          ) : null}
          {initialValues ? (
            <ClubEditForm
              initialValues={initialValues}
              busy={busy}
              error={error}
              onSubmit={(values) => fireAndForget(submit(values))}
            />
          ) : null}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}

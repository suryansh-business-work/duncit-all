import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import { makeClubEditSchema, type ClubEditFormValues } from './club-edit.form';
import { ClubContentFields } from './ClubContentFields';

interface Props {
  initialValues: ClubEditFormValues;
  busy: boolean;
  /** Why the last save failed, or null. */
  error: string | null;
  onSubmit: (values: ClubEditFormValues) => void;
}

/**
 * The Club Admin's club form — the Tamagui twin of @duncit/club-form's
 * `ClubEditorPage` under the partner config (no admins, no verified flag, no
 * active toggle): name, description, the WhatsApp links, the feature media,
 * the four bullet lists and the FAQs (rule 27), grouped into the same four
 * titled sections the MUI form draws.
 */
export function ClubEditForm({ initialValues, busy, error, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeClubEditSchema(t), [t]);
  const form = useForm<ClubEditFormValues, any, ClubEditFormValues>({
    resolver: formResolver<ClubEditFormValues>(schema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const { control } = form;
  const saveLabel = busy ? t('mweb.hostPodActions.saving') : t('mweb.hostManage.saveChanges');

  return (
    <YStack gap={20} testID="club-edit-form">
      <SurfaceCard gap={14}>
        <SectionHeader title={t('clubForm.clubSections.basicInformation')} />
        <FormTextField
          control={control}
          name="club_name"
          label={t('clubForm.basicSection.clubName')}
          required
        />
        <FormTextField
          control={control}
          name="club_description"
          label={t('clubForm.common.description')}
          multiline
          required
        />
      </SurfaceCard>
      <SurfaceCard gap={14}>
        <SectionHeader title={t('clubForm.clubSections.venuesAndCommunityLinks')} />
        <FormTextField
          control={control}
          name="community_link"
          label={t('clubForm.linksSection.whatsappCommunityLink')}
          keyboardType="url"
          autoCapitalize="none"
          required
        />
        <FormTextField
          control={control}
          name="group_link"
          label={t('clubForm.linksSection.whatsappGroupLink')}
          keyboardType="url"
          autoCapitalize="none"
          required
        />
      </SurfaceCard>
      <SurfaceCard gap={14}>
        <SectionHeader title={t('clubForm.clubSections.mediaAndMoments')} />
        <Controller
          control={control}
          name="feature_text"
          render={({ field, fieldState }) => (
            <MediaUploadField
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              label={t('clubForm.mediaSection.featureImagesAndVideos')}
              required
              folder="/clubs"
            />
          )}
        />
      </SurfaceCard>
      <SurfaceCard gap={14}>
        <SectionHeader title={t('clubForm.clubSections.pageContentWhoWeArePerks')} />
        <ClubContentFields control={control} />
      </SurfaceCard>
      {error ? (
        <Text testID="club-edit-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        testID="club-edit-save"
        label={saveLabel}
        loading={busy}
        onPress={() => fireAndForget(form.handleSubmit(onSubmit)())}
      />
    </YStack>
  );
}

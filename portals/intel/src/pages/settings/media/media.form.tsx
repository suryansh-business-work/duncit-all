import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { NUMERIC } from '../fields';
import SectionForm from '../SectionForm';
import { makeMediaSchema, SUPPORTED_TYPES, VISIBILITIES, type MediaOutput, type MediaValues } from './media.types';

const VISIBILITY_KEYS = { PRIVATE: 'intel.media.visibility.PRIVATE', TEAM: 'intel.media.visibility.TEAM', ADMINS: 'intel.media.visibility.ADMINS' } as const;

export interface MediaFormProps {
  values: MediaValues;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: MediaOutput) => void;
}

/** Upload limits, which types are accepted, how files are read and who sees a new upload. */
export default function MediaForm({ values, saving, errorMessage, onSubmit }: Readonly<MediaFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeMediaSchema(t), [t]);
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <RhfTextField control={control} name="max_file_mb" label={t('intel.settings.media.maxMb')} hint={t('intel.settings.media.maxMbHint')} {...NUMERIC} />
          <RhfSelect control={control} name="allowed_types" multiple label={t('intel.settings.media.types')} options={SUPPORTED_TYPES.map((type) => ({ value: type, label: type }))} />
          <RhfSwitch control={control} name="auto_index" label={t('intel.settings.media.autoIndex')} hint={t('intel.settings.media.autoIndexHint')} />
          <RhfSwitch control={control} name="extract_pdf" label={t('intel.settings.media.extractPdf')} />
          <RhfSwitch control={control} name="ocr_images" label={t('intel.settings.media.ocr')} hint={t('intel.settings.media.ocrHint')} />
          <RhfTextField control={control} name="vision_model" label={t('intel.settings.media.visionModel')} />
          <RhfSelect control={control} name="default_visibility" label={t('intel.settings.media.defaultVisibility')} options={VISIBILITIES.map((v) => ({ value: v, label: t(VISIBILITY_KEYS[v]) }))} />
        </>
      )}
    </SectionForm>
  );
}

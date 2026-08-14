import type { ReactNode } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { AisensyCampaign, AisensyTemplate } from '../queries';
import CtaButtonsField from './CtaButtonsField';
import MediaField from './MediaField';
import ParamsField from './ParamsField';
import { dynamicButtons, isDocumentHeader } from './template-fields';

interface Props<T extends FieldValues> {
  control: Control<T>;
  template: AisensyTemplate | null;
  /** The campaign picked, which is where a header asset already lives. */
  campaign: AisensyCampaign | null;
  hint: ReactNode;
}

/**
 * Everything the chosen template makes this send responsible for, in the order
 * the message is built: the header asset, the body's variables, then the links
 * under it. One component so the campaign form and the test form ask for the
 * same things — they go through the same server gate.
 */
export default function TemplateInputs<T extends FieldValues>({
  control,
  template,
  campaign,
  hint,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const showMedia = template?.needs_media === true || !!campaign?.media_url;
  const buttons = dynamicButtons(template);
  // A plain template with no variables asks the operator for nothing at all —
  // an empty block would only be a gap in the dialog.
  if (template && !showMedia && template.param_count === 0 && buttons.length === 0) return null;

  return (
    <Stack spacing={2}>
      {!template && <Alert severity="info">{t('marketingWhatsapp.templateUnknown')}</Alert>}
      {showMedia && (
        <MediaField
          control={control}
          isDocument={isDocumentHeader(template)}
          fromCampaign={!!campaign?.media_url}
        />
      )}
      <ParamsField control={control} body={template?.body ?? ''} hint={hint} />
      <CtaButtonsField control={control} buttons={buttons} />
    </Stack>
  );
}

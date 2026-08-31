import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import {
  CREATE_AISENSY_CAMPAIGN,
  CREATE_AISENSY_TEMPLATE,
  DELETE_AISENSY_TEMPLATE,
  type AisensyTemplate,
  type CreateAisensyCampaignInput,
  type CreateAisensyTemplateInput,
} from '../queries';

/**
 * The three writes this screen makes, all of them straight through to AiSensy
 * with nothing kept here.
 *
 * There is no update: AiSensy has no endpoint for changing a template or a
 * campaign, so the only way to change one is to delete it and submit a new
 * name. Every result reports through the shared notify host, the way the rest
 * of this page already does.
 *
 * The three are memoised because `removeTemplate` reaches a table column
 * definition: a fresh function each render is a fresh column array each render,
 * which makes the grid reconfigure mid-interaction.
 */
export function useAisensyDrafts(onChanged: () => void) {
  const { t } = useTranslation();
  const [createTemplate, { loading: creatingTemplate }] = useMutation<any>(CREATE_AISENSY_TEMPLATE);
  const [createCampaign, { loading: creatingCampaign }] = useMutation<any>(CREATE_AISENSY_CAMPAIGN);
  const [deleteTemplate, { loading: deletingTemplate }] = useMutation<any>(DELETE_AISENSY_TEMPLATE);

  const submitTemplate = useCallback(
    async (input: CreateAisensyTemplateInput) => {
      let note = '';
      try {
        const result = await createTemplate({ variables: { input } });
        note = result.data?.createAisensyTemplate?.reason ?? '';
      } catch (e) {
        notifyError(parseApiError(e, t('marketingWhatsapp.templateFailed')));
        return false;
      }
      // Meta reviews asynchronously, so this never claims approval — and
      // AiSensy's own note, when it sends one, is the only thing that says more.
      const submitted = t('marketingWhatsapp.templateSubmitted');
      notifySuccess(note ? `${submitted} ${note}` : submitted);
      onChanged();
      return true;
    },
    [createTemplate, onChanged, t]
  );

  const submitCampaign = useCallback(
    async (input: CreateAisensyCampaignInput) => {
      try {
        await createCampaign({ variables: { input } });
      } catch (e) {
        notifyError(parseApiError(e, t('marketingWhatsapp.campaignFailed')));
        return false;
      }
      notifySuccess(t('marketingWhatsapp.campaignCreated'));
      onChanged();
      return true;
    },
    [createCampaign, onChanged, t]
  );

  const removeTemplate = useCallback(
    async (template: AisensyTemplate) => {
      try {
        await deleteTemplate({ variables: { template_id: template.id } });
      } catch (e) {
        notifyError(parseApiError(e, t('marketingWhatsapp.deleteFailed')));
        return;
      }
      notifySuccess(t('marketingWhatsapp.templateDeleted'));
      onChanged();
    },
    [deleteTemplate, onChanged, t]
  );

  return {
    submitTemplate,
    submitCampaign,
    removeTemplate,
    creatingTemplate,
    creatingCampaign,
    deletingTemplate,
  };
}

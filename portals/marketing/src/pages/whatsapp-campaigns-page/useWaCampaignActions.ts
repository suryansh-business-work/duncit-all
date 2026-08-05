import { useMutation } from '@apollo/client';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { CampaignNameValues } from './campaign-name-form';
import type { SendWaCampaignInput } from './wa-campaign-form';
import {
  CREATE_WA_CAMPAIGN_NAME,
  DELETE_WA_CAMPAIGN,
  DELETE_WA_CAMPAIGN_NAME,
  SEND_WA_CAMPAIGN,
  type WaCampaignNameOption,
  type WaCampaignRow,
} from './queries';

/**
 * Everything the WhatsApp campaigns page does to the server. Kept out of the
 * page so the page stays layout, and every action reports through the shared
 * notify host instead of each dialog growing its own error state.
 */
export function useWaCampaignActions(onChanged: () => void) {
  const [sendCampaign, { loading: sending }] = useMutation(SEND_WA_CAMPAIGN);
  const [deleteCampaign, { loading: deleting }] = useMutation(DELETE_WA_CAMPAIGN);
  const [createName, { loading: adding }] = useMutation(CREATE_WA_CAMPAIGN_NAME);
  const [deleteName, { loading: removingName }] = useMutation(DELETE_WA_CAMPAIGN_NAME);

  const send = async (input: SendWaCampaignInput) => {
    try {
      await sendCampaign({ variables: { input } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not start the campaign'));
      return false;
    }
    notifySuccess('Campaign started — the table updates as it sends');
    onChanged();
    return true;
  };

  const remove = async (row: WaCampaignRow) => {
    try {
      await deleteCampaign({ variables: { campaign_id: row.campaign_id } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not delete the campaign'));
      return false;
    }
    notifySuccess(`“${row.name}” deleted`);
    onChanged();
    return true;
  };

  const addName = async (values: CampaignNameValues) => {
    try {
      await createName({ variables: { input: values } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not add that campaign name'));
      return;
    }
    onChanged();
  };

  const removeName = async (option: WaCampaignNameOption) => {
    try {
      await deleteName({ variables: { id: option.id } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not remove that campaign name'));
      return;
    }
    onChanged();
  };

  return {
    send,
    remove,
    addName,
    removeName,
    sending,
    deleting,
    namesBusy: adding || removingName,
  };
}

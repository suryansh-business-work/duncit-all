import { useMutation } from '@apollo/client';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { CampaignNameValues } from './campaign-name-form';
import type { SendWaCampaignInput } from './wa-campaign-form';
import type { WaTestInput } from './wa-test-form';
import {
  CANCEL_WA_CAMPAIGN,
  CREATE_WA_CAMPAIGN_NAME,
  DELETE_WA_CAMPAIGN,
  DELETE_WA_CAMPAIGN_NAME,
  RETRY_WA_CAMPAIGN,
  SEND_WA_CAMPAIGN,
  SEND_WA_TEST_MESSAGE,
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
  const [cancelCampaign, { loading: cancelling }] = useMutation(CANCEL_WA_CAMPAIGN);
  const [retryCampaign, { loading: retrying }] = useMutation(RETRY_WA_CAMPAIGN);
  const [sendTest, { loading: testing }] = useMutation(SEND_WA_TEST_MESSAGE);
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

  const cancel = async (row: WaCampaignRow) => {
    try {
      await cancelCampaign({ variables: { campaign_id: row.campaign_id } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not cancel that campaign'));
      return;
    }
    notifySuccess(`“${row.name}” cancelled — it will not go out`);
    onChanged();
  };

  const retry = async (row: WaCampaignRow) => {
    try {
      await retryCampaign({ variables: { campaign_id: row.campaign_id } });
    } catch (e) {
      notifyError(parseApiError(e, 'Could not retry that campaign'));
      return;
    }
    notifySuccess('Retrying the people it did not reach — the table updates as it goes');
    onChanged();
  };

  /** Returns AiSensy's own message id so the dialog can show what to trace. */
  const testMessage = async (input: WaTestInput) => {
    try {
      const result = await sendTest({ variables: { input } });
      const sent = result.data?.sendWaTestMessage;
      notifySuccess(`Test sent — message id ${sent?.submitted_message_id ?? ''}`);
      return true;
    } catch (e) {
      notifyError(parseApiError(e, 'The test message did not go out'));
      return false;
    }
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
    cancel,
    retry,
    testMessage,
    remove,
    addName,
    removeName,
    sending,
    cancelling,
    retrying,
    testing,
    deleting,
    namesBusy: adding || removingName,
  };
}

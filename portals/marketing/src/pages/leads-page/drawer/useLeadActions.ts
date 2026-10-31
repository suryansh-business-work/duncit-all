import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { CRM_KIND_LABEL, STAGE_LABEL } from '../copy';
import {
  ADD_MARKETING_LEAD_NOTE,
  ASSIGN_MARKETING_LEAD_OWNER,
  PROMOTE_MARKETING_LEAD,
  SET_MARKETING_LEAD_STAGE,
  type MarketingLeadCrmKind,
  type MarketingLeadDetail,
  type MarketingLeadStage,
} from '../queries';

/**
 * What a person does to one lead from its drawer. Every action tells the
 * person how it went, and hands the lead as the server now has it back to
 * the drawer — true when it worked, so a dialog knows to close.
 */
export function useLeadActions(leadId: string, onChanged: (lead: MarketingLeadDetail) => void) {
  const { t } = useTranslation();
  const [stageMut, stageState] = useMutation<{ setMarketingLeadStage: MarketingLeadDetail }>(SET_MARKETING_LEAD_STAGE);
  const [ownerMut, ownerState] = useMutation<{ assignMarketingLeadOwner: MarketingLeadDetail }>(ASSIGN_MARKETING_LEAD_OWNER);
  const [noteMut, noteState] = useMutation<{ addMarketingLeadNote: MarketingLeadDetail }>(ADD_MARKETING_LEAD_NOTE);
  const [promoteMut, promoteState] = useMutation<{ promoteMarketingLeadToCrm: MarketingLeadDetail }>(PROMOTE_MARKETING_LEAD);

  const run = async (work: () => Promise<MarketingLeadDetail | undefined>, done: string): Promise<boolean> => {
    try {
      const lead = await work();
      if (!lead) return false;
      notify(done, 'success');
      onChanged(lead);
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return {
    busy: stageState.loading || ownerState.loading || noteState.loading || promoteState.loading,
    setStage: (stage: MarketingLeadStage, note?: string) =>
      run(
        async () => (await stageMut({ variables: { id: leadId, stage, note: note ?? null } })).data?.setMarketingLeadStage,
        t('marketing.leads.stageChanged', { vars: { stage: t(STAGE_LABEL[stage]) } }),
      ),
    assignOwner: (ownerUserId: string | null) =>
      run(
        async () => (await ownerMut({ variables: { id: leadId, owner_user_id: ownerUserId } })).data?.assignMarketingLeadOwner,
        t('marketing.leads.ownerSaved'),
      ),
    addNote: (text: string) =>
      run(async () => (await noteMut({ variables: { id: leadId, text } })).data?.addMarketingLeadNote, t('marketing.leads.noteAdded')),
    promote: (kind: MarketingLeadCrmKind) =>
      run(
        async () => (await promoteMut({ variables: { id: leadId, kind } })).data?.promoteMarketingLeadToCrm,
        t('marketing.leads.promoteDone', { vars: { kind: t(CRM_KIND_LABEL[kind]) } }),
      ),
  };
}

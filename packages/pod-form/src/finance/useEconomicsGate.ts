import { useFormContext, useWatch } from 'react-hook-form';
import { paidPodSubmitBlocked } from '@duncit/utils';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';
import { ECONOMICS_FIELDS, economicsJudged, economicsTouched } from './economicsGate';
import { useFormEarnings } from './useFormEarnings';

/**
 * Whether the form's Save (and Save as Draft) stays disabled because the
 * server's verdict has not cleared this pod: a PAID pod on create, or on an
 * edit that changed its money, waits for a fresh projection that says viable
 * — loading, stale, failed or missing all wait. Free pods, completed and
 * cancelled pods, and forms that draw no projection never wait. The server's
 * own guard still decides; this only keeps a doomed save from being sent.
 */
export function useEconomicsGate(): boolean {
  const { config, finance, podClosed, editingPodDocId } = usePodFormData();
  const { control, formState, getValues } = useFormContext<PodFormValues>();
  const enabled = Boolean(config.showFinance && !config.autoPod && finance);
  const earnings = useFormEarnings(enabled);
  const values = useWatch({ control, name: ECONOMICS_FIELDS });
  const current = Object.fromEntries(ECONOMICS_FIELDS.map((field, index) => [field, values[index]]));
  const judged = economicsJudged({
    enabled,
    isFree: earnings.isFree,
    podAmount: earnings.podAmount,
    // An existing pod carries its code (the same test PodForm reads for an edit).
    editing: Boolean(editingPodDocId || getValues('pod_id')),
    podClosed: Boolean(podClosed),
    touched: economicsTouched(formState.defaultValues, current),
  });
  return judged && paidPodSubmitBlocked(false, earnings.fresh, earnings.projection);
}

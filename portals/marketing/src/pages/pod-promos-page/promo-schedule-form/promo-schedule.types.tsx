import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { collaboratorsSchema } from '../../../components/collaborators';
import type { PickOption, PodBannerStyle } from '../queries';

/** A minute of grace, matching the server, so "now-ish" is not refused as the past. */
const PAST_GRACE_MS = 60_000;

/** Every field is optional to fill: left empty, the server uses what the settings say. */
export interface PromoScheduleFormValues {
  /** ISO string; '' for the settings' own slot (days before, at the post hour). */
  at: string;
  /** Empty for the accounts in the settings. */
  account_ids: string[];
  collaborators: string[];
}

export interface PromoScheduleFormProps {
  accounts: readonly PickOption[];
  /**
   * The collaborators the promotion already has. Null when there is none yet:
   * the server then invites the venue and host that opted in, unless the
   * manager types their own.
   */
  collaborators: string[] | null;
  /** The admin time zone the settings' post hour is read in. */
  timeZone: string;
  busy: boolean;
  /** `collaboratorsChosen` says whether the list is a person's choice or should be left to the server. */
  onSubmit: (values: PromoScheduleFormValues, collaboratorsChosen: boolean) => Promise<void>;
}

export const blankScheduleValues = (collaborators: string[] | null): PromoScheduleFormValues => ({
  at: '',
  account_ids: [],
  collaborators: collaborators ? [...collaborators] : [],
});

const inFuture = (iso: string) => {
  const at = Date.parse(iso);
  return !Number.isNaN(at) && at >= Date.now() - PAST_GRACE_MS;
};

export const promoScheduleSchema = (t: Translate) =>
  z.object({
    at: z.string().refine((iso) => iso === '' || inFuture(iso), t('marketing.podPromo.scheduleFuture')),
    account_ids: z.array(z.string()),
    collaborators: collaboratorsSchema(t),
  });

/** The schedulePodPromo variables: an empty field becomes null so the server fills it from the settings. */
export function toScheduleVariables(values: PromoScheduleFormValues, podId: string, style: PodBannerStyle | null, collaboratorsChosen: boolean) {
  return {
    pod_id: podId,
    at: values.at || null,
    account_ids: values.account_ids.length > 0 ? values.account_ids : null,
    collaborators: collaboratorsChosen ? values.collaborators : null,
    style,
  };
}

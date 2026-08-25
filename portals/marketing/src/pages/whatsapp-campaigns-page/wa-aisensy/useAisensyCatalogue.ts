import { useQuery } from '@apollo/client';
import {
  AISENSY_CATALOGUE,
  type AisensyCampaign,
  type AisensyTemplate,
  type WaCampaignNameOption,
} from '../queries';

interface CatalogueData {
  aisensyProjectConfigured: boolean;
  aisensyCampaigns: AisensyCampaign[];
  aisensyTemplates: AisensyTemplate[];
}

/**
 * What AiSensy has right now: the campaigns a send can be pointed at and the
 * templates behind them. Shared by the two sections and the campaign form, so
 * all three read one cached answer instead of three round trips that could
 * disagree with each other.
 *
 * `errorPolicy: 'all'` because a refused Project API is information the caller
 * shows, not a reason to render nothing.
 *
 * `skip` exists for the callers that only need the catalogue once something is
 * opened — reading it costs a live round trip to AiSensy's Project API, so a
 * screen that may never ask must not pay for it on mount.
 */
export function useAisensyCatalogue(options: Readonly<{ skip?: boolean }> = {}) {
  const { data, loading, error, refetch } = useQuery<CatalogueData>(AISENSY_CATALOGUE, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    skip: options.skip,
  });
  return {
    // Undefined while the first request is in flight — treated as configured so
    // the section shows a spinner rather than flashing the "add credentials" note.
    configured: data?.aisensyProjectConfigured !== false,
    campaigns: data?.aisensyCampaigns ?? [],
    templates: data?.aisensyTemplates ?? [],
    loading,
    error,
    // One query, one cache entry: a submit from either section re-reads for
    // both, so a new template cannot exist on one tab and not the other.
    refetch,
  };
}

/**
 * What a campaign picker should offer. AiSensy's own list wins when the Project
 * API answers — a name typed into the saved list can be wrong, a name AiSensy
 * returned cannot. The saved names carry it when the Project API is not set up.
 * Both pickers use this, so they can never offer different things.
 */
export function useCampaignOptions(names: WaCampaignNameOption[]) {
  const { configured, campaigns, templates } = useAisensyCatalogue();
  const live = configured && campaigns.length > 0;
  const options = live
    ? campaigns.map((campaign) => ({
        value: campaign.name,
        label: `${campaign.name} · ${campaign.status}`,
      }))
    : names.map((option) => ({
        value: option.name,
        label: option.description ? `${option.name} · ${option.description}` : option.name,
      }));
  return { options, live, campaigns, templates };
}

/**
 * The campaign a send is addressed to, when the Project API answered.
 *
 * Worth having on its own because the header asset lives on the CAMPAIGN rather
 * than on its template — a send form prefills from here.
 */
export function campaignFor(
  campaignName: string,
  campaigns: AisensyCampaign[]
): AisensyCampaign | null {
  return campaigns.find((item) => item.name === campaignName) ?? null;
}

/** The template a campaign sends, when both are known. */
export function templateFor(
  campaignName: string,
  campaigns: AisensyCampaign[],
  templates: AisensyTemplate[]
): AisensyTemplate | null {
  const campaign = campaignFor(campaignName, campaigns);
  if (!campaign?.template_name) return null;
  return templates.find((template) => template.name === campaign.template_name) ?? null;
}

import type { ProvisionLabels } from '../scenarioCells';
import type { MediaState } from '../helpers';

/** Every translated label the scenario columns hand to their cells. */
export function buildScenarioLabels(t: (key: string) => string) {
  const firesLabel = t('adminWhatsapp.firesLabel');
  const paramsLabel = t('adminWhatsapp.paramsLabel');
  const readyLabel = t('adminWhatsapp.blockerNone');
  const provisionLabels: ProvisionLabels = {
    TEMPLATE: {
      label: t('adminWhatsapp.provisionTemplate'),
      hint: t('adminWhatsapp.provisionTemplateHint'),
    },
    CAMPAIGN: {
      label: t('adminWhatsapp.provisionCampaign'),
      hint: t('adminWhatsapp.provisionCampaignHint'),
    },
  };
  const lockedTitle = t('adminWhatsapp.cannotDisable');
  const lockedHint = t('adminWhatsapp.cannotDisableHint');
  const mediaStateLabels: Record<MediaState, string> = {
    NOT_NEEDED: t('adminWhatsapp.mediaNotNeeded'),
    MISSING: t('adminWhatsapp.mediaNone'),
    CAMPAIGN: t('adminWhatsapp.mediaFromCampaign'),
    DEFAULT: t('adminWhatsapp.mediaDefault'),
    CUSTOM: t('adminWhatsapp.mediaCustom'),
  };
  const setMediaLabel = t('adminWhatsapp.setMedia');
  return {
    firesLabel,
    paramsLabel,
    readyLabel,
    provisionLabels,
    lockedTitle,
    lockedHint,
    mediaStateLabels,
    setMediaLabel,
  };
}

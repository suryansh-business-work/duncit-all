/**
 * The lead kinds a Service Offered can be shown to (CRM › Data › Services
 * Offered), each with the catalogue flag the server stores. The list and its
 * helpers live in @duncit/utils (crm-service-targets) so the Duncit CRM app
 * runs on the same rules; this file keeps the portal's own names for them.
 */
export {
  CRM_SERVICE_TARGETS as SERVICE_TARGETS,
  crmAllServiceTargets as allServiceTargets,
  crmDefaultServiceTargets as defaultServiceTargets,
  crmHasAnyServiceTarget as hasAnyTarget,
  crmNormalizeServiceTitles as normalizeServiceTitles,
  crmPickServiceTargets as pickServiceTargets,
  crmServiceTargetFlag as flagForKind,
  crmServiceTargetLabelKeys as serviceTargetLabelKeys,
  type CrmServiceTargetFlag as ServiceTargetFlag,
  type CrmServiceTargetKind as ServiceTargetKind,
  type CrmServiceTargets as ServiceTargets,
} from '@duncit/utils';

import { crmEvidenceByKey, crmItemNamesOf } from '@duncit/utils';
import type { LeadQualityDetails } from '../../api/leadQuality.gql';

/** The calculated score every view of a lead reads (ring, breakdown, qualification). */
export type QualityResult = NonNullable<LeadQualityDetails['result']>;
export type QualityCriterion = QualityResult['criteria'][number];
/** One scored item: a criterion without sub-criteria, or one sub-criterion (`criterion_key.sub_key`). */
export type QualityItemResult = QualityCriterion['items'][number];
/** The decision recorded against one item, with who made it and the source. */
export type QualityEvidence = LeadQualityDetails['evidence'][number];

/** Evidence by the item key it was recorded against. */
export const evidenceByKey = (evidence: readonly QualityEvidence[]): ReadonlyMap<string, QualityEvidence> => crmEvidenceByKey(evidence);

/** Item names by key, for the history (it stores keys, the breakdown knows names). */
export const itemNamesOf = (result: QualityResult | null | undefined): ReadonlyMap<string, string> => crmItemNamesOf(result);

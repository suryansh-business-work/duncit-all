import type { QuestionType, SurveyKind } from '../queries';
import type { DraftQuestion } from '../QuestionCard';

export const blankByType = (type: QuestionType): DraftQuestion => ({ type, label: '', help: '', required: false, multi: false, options: type === 'MCQ' ? [''] : [] });
const KINDS = new Set<SurveyKind>(['VENUE', 'HOST', 'ECOMM', 'CLUB_ADMIN']);
export const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'E-Commerce Brand', CLUB_ADMIN: 'Club Admin' };
export const initialKind = (raw: string | null): SurveyKind => (raw && KINDS.has(raw as SurveyKind) ? (raw as SurveyKind) : 'VENUE');

export const NODE_KINDS = ['HEAD', 'DEPARTMENT', 'ROLE', 'AI_AGENT'] as const;
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'ADVISOR', 'AI_AGENT'] as const;
export const NODE_STATUSES = ['FILLED', 'VACANT', 'OPTIONAL'] as const;
export const PAY_KINDS = ['FIXED', 'VARIABLE'] as const;
export const PAY_FREQUENCIES = ['MONTHLY', 'ANNUAL', 'PER_UNIT'] as const;

export type NodeKind = (typeof NODE_KINDS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type NodeStatus = (typeof NODE_STATUSES)[number];
export type PayKind = (typeof PAY_KINDS)[number];
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export interface PayLine {
  label: string;
  kind: PayKind;
  frequency: PayFrequency;
  amount: number;
  min_amount?: number | null;
  max_amount?: number | null;
  note?: string | null;
}

export interface TeamNode {
  id: string;
  structure_id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  person_name?: string | null;
  user_id?: string | null;
  department?: string | null;
  employment_type: EmploymentType;
  status: NodeStatus;
  notes?: string | null;
  sort_order: number;
  /** Null on a public link that hides salary. */
  pay: PayLine[] | null;
  monthly_cost: number | null;
}

export interface TeamStructureInfo {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  /** Only on the list query. */
  seat_count?: number | null;
  monthly_cost?: number | null;
  updated_at?: string | null;
}

/** What a seat is saved as — the node without server-derived money or ownership. */
export interface NodeDraft {
  id?: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  person_name?: string | null;
  department?: string | null;
  employment_type: EmploymentType;
  status: NodeStatus;
  notes?: string | null;
  sort_order: number;
  pay: PayLine[];
}

/** GraphQL rejects `__typename` inside an input, so it is stripped on the way back out. */
export function draftOf(node: TeamNode): NodeDraft {
  return {
    id: node.id,
    parent_id: node.parent_id,
    kind: node.kind,
    title: node.title,
    person_name: node.person_name ?? null,
    department: node.department ?? null,
    employment_type: node.employment_type,
    status: node.status,
    notes: node.notes ?? null,
    sort_order: node.sort_order,
    pay: (node.pay ?? []).map(({ label, kind, frequency, amount, min_amount, max_amount, note }) => ({
      label,
      kind,
      frequency,
      amount,
      min_amount: min_amount ?? null,
      max_amount: max_amount ?? null,
      note: note ?? null,
    })),
  };
}

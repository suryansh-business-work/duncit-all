import type { IEmployeeTarget, ITargetPerson } from './employeeTarget.model';

const iso = (value: Date | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

function personOut(person: ITargetPerson) {
  return { user_id: String(person.user_id), name: person.name ?? '', email: person.email ?? null };
}

/**
 * A stored target as the GraphQL `EmployeeTarget` type. `dueMonths` is the set
 * of months whose reminder window is open today (server clock, admin zone), so
 * neither console recomputes the window: a row is "due" only while it is still
 * unsubmitted inside one.
 */
export function toTargetRow(doc: IEmployeeTarget, dueMonths: ReadonlySet<string>) {
  const { submission, review } = doc;
  return {
    id: String(doc._id),
    employee: personOut(doc.employee),
    month: doc.month,
    goals: (doc.goals ?? []).map((goal) => ({
      title: goal.title,
      description: goal.description ?? '',
      target_value: goal.target_value ?? null,
      unit: goal.unit ?? '',
    })),
    goal_count: doc.goals?.length ?? 0,
    notes: doc.notes ?? '',
    status: doc.status,
    submission: submission
      ? {
          completion_percent: submission.completion_percent,
          achievements: (submission.achievements ?? []).map((a) => ({ title: a.title, details: a.details ?? '' })),
          updates: submission.updates ?? '',
          submitted_at: iso(submission.submitted_at) ?? '',
          submission_count: submission.submission_count ?? 1,
        }
      : null,
    review: review
      ? { comment: review.comment ?? '', reviewed_by: personOut(review.reviewed_by), reviewed_at: iso(review.reviewed_at) ?? '' }
      : null,
    reminder_active: doc.status === 'ASSIGNED' && dueMonths.has(doc.month),
    revision: doc.revision ?? 0,
    assigned_by: personOut(doc.assigned_by),
    last_edited_by: doc.last_edited_by ? personOut(doc.last_edited_by) : null,
    last_edited_at: iso(doc.last_edited_at),
    created_at: iso(doc.created_at) ?? '',
    updated_at: iso(doc.updated_at) ?? '',
  };
}

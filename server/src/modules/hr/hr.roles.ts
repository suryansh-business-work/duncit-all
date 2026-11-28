import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';

/**
 * Who may run the HR console's operations: SUPER_ADMIN and the HR console's
 * seats, read from the portal map so "who may hire" and "who may sign in to
 * the HR console" can never disagree.
 */
export const HR_ROLES: readonly string[] = ['SUPER_ADMIN', ...PORTAL_ROLE_REQUIREMENTS.hr];

/** The Employee console's own reads and writes, always scoped to the caller's id. */
export const EMPLOYEE_SELF_ROLES: readonly string[] = ['EMPLOYEE', 'SUPER_ADMIN'];

/**
 * Who may create or edit a club. One list, read by the club resolvers and by
 * anything else that creates clubs on someone's behalf (the staff Agent), so
 * no side door can let a role do what the Clubs console refuses it.
 */
export const CLUB_WRITE_ROLES: readonly string[] = ['SUPER_ADMIN', 'CITY_ADMIN'];

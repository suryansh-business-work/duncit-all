import { describe, expect, it } from 'vitest';
import { PORTAL_ACCESS, portalForRole } from '../portalAccess';

/**
 * Which console each role opens — the Roles table links a role to it. The pet
 * store has its own staff role; ECOMM_MANAGER is the Partner Brand role and
 * belongs to the app side, never to the E-commerce console.
 */
describe('portalForRole', () => {
  it('sends the pet store staff role to the E-commerce console', () => {
    expect(portalForRole('ECOMM_STORE_MANAGER')?.portalName).toBe('E-commerce');
  });

  it('keeps the Partner Brand role on the Duncit App, not the store console', () => {
    expect(portalForRole('ECOMM_MANAGER')?.portalName).toBe('Duncit App');
    const ecomm = PORTAL_ACCESS.find((portal) => portal.key === 'ecomm-portal');
    expect(ecomm?.roles.map((role) => role.key)).toEqual(['ECOMM_STORE_MANAGER']);
  });

  it('places the analyst and agent seats on Finance and Support', () => {
    expect(portalForRole('FINANCE_USER')?.portalName).toBe('Finance');
    expect(portalForRole('SUPPORT_USER')?.portalName).toBe('Support');
    expect(portalForRole('FINANCE_MANAGER')?.portalName).toBe('Finance');
  });

  it('answers nothing for a role no console lists', () => {
    expect(portalForRole('NOT_A_ROLE')).toBeUndefined();
  });
});

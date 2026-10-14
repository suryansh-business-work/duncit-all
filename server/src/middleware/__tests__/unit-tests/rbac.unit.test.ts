import type { GraphQLContext } from '../../../context';
import { assertScope, readScope } from '../../rbac';

/** A context carrying just the signed-in admin the scope check reads. */
const asAdmin = (user: { roles: string[]; assigned_city?: string | null; assigned_zones?: string[] }) =>
  ({ user: { id: '64b0000000000000000000aa', email: 'admin@example.com', ...user } }) as unknown as GraphQLContext;

const scopeError = (ctx: GraphQLContext, target: { city?: string | null; zone?: string | null }) => {
  try {
    assertScope(ctx, target);
    return null;
  } catch (error) {
    const { message, extensions } = error as { message: string; extensions?: { code?: string } };
    return `${extensions?.code}: ${message}`;
  }
};

describe('assertScope', () => {
  it('lets SUPER_ADMIN act anywhere', () => {
    expect(scopeError(asAdmin({ roles: ['SUPER_ADMIN'] }), { city: 'Pune', zone: 'North' })).toBeNull();
  });

  it('keeps a CITY_ADMIN inside their city', () => {
    const cityAdmin = asAdmin({ roles: ['CITY_ADMIN'], assigned_city: 'Delhi' });
    expect(scopeError(cityAdmin, { city: 'Delhi' })).toBeNull();
    expect(scopeError(cityAdmin, { city: 'Pune' })).toBe('FORBIDDEN: Out of city scope');
  });

  it('refuses a CITY_ADMIN with no city assigned, even for a target with a city', () => {
    expect(scopeError(asAdmin({ roles: ['CITY_ADMIN'], assigned_city: null }), { city: 'Pune' })).toBe(
      'FORBIDDEN: Out of city scope',
    );
    expect(scopeError(asAdmin({ roles: ['CITY_ADMIN'] }), { city: null })).toBe('FORBIDDEN: Out of city scope');
  });

  it('keeps a ZONAL_ADMIN inside their zones and refuses one with none', () => {
    const zonal = asAdmin({ roles: ['ZONAL_ADMIN'], assigned_zones: ['North', 'East'] });
    expect(scopeError(zonal, { zone: 'East' })).toBeNull();
    expect(scopeError(zonal, { zone: 'South' })).toBe('FORBIDDEN: Out of zone scope');
    expect(scopeError(asAdmin({ roles: ['ZONAL_ADMIN'], assigned_zones: [] }), { zone: 'East' })).toBe(
      'FORBIDDEN: Out of zone scope',
    );
    expect(scopeError(asAdmin({ roles: ['ZONAL_ADMIN'] }), { zone: null })).toBe('FORBIDDEN: Out of zone scope');
  });

  it('refuses a signed-out caller', () => {
    expect(scopeError({ user: null } as unknown as GraphQLContext, { city: 'Delhi' })).toBe(
      'UNAUTHENTICATED: Not authenticated',
    );
  });
});

describe('readScope', () => {
  const refusalOf = (ctx: GraphQLContext) => {
    try {
      readScope(ctx);
    } catch (error) {
      return (error as { message: string }).message;
    }
    throw new Error('Expected readScope to refuse');
  };

  it('narrows nothing for SUPER_ADMIN, even one who also holds CITY_ADMIN, nor for an unplaced role', () => {
    expect(readScope(asAdmin({ roles: ['SUPER_ADMIN', 'CITY_ADMIN'] }))).toBeNull();
    expect(readScope(asAdmin({ roles: ['SUPPORT_USER'] }))).toBeNull();
  });

  it('holds a CITY_ADMIN to their city and refuses one without a city', () => {
    expect(readScope(asAdmin({ roles: ['CITY_ADMIN'], assigned_city: 'Delhi' }))).toEqual({ city: 'Delhi' });
    expect(refusalOf(asAdmin({ roles: ['CITY_ADMIN'], assigned_city: '' }))).toBe('Out of city scope');
  });

  it('holds a ZONAL_ADMIN to their zones and refuses one without zones', () => {
    expect(readScope(asAdmin({ roles: ['ZONAL_ADMIN'], assigned_zones: ['North'] }))).toEqual({ zones: ['North'] });
    expect(refusalOf(asAdmin({ roles: ['ZONAL_ADMIN'] }))).toBe('Out of zone scope');
  });
});

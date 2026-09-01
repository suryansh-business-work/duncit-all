import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { useUserDetailsState } from '../useUserDetailsState';
import {
  ASSIGN_ROLES,
  DELETE_USER,
  UPDATE_USER,
  USER,
  USER_HOST_PROFILE,
  type EditForm,
} from '../queries';
import { makeWrapper } from './testkit';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => nav.fn,
}));

const USER_ID = 'u-1';

const userDoc = (over: Record<string, unknown> = {}) => ({
  __typename: 'User',
  user_id: USER_ID,
  first_name: 'Riya',
  last_name: 'Sharma',
  full_name: 'Riya Sharma',
  email: 'riya@example.com',
  is_email_verified: true,
  phone_number: '9876543210',
  phone_extension: '+91',
  is_phone_verified: false,
  country: 'India',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: ['West', 'North'],
  profile_photo: '',
  bio: 'Loves pods',
  profile_links: [],
  interest_category_ids: [],
  interest_categories: [],
  status: 'ACTIVE',
  roles: ['USER', 'HOST'],
  dob: '1995-04-02',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
  ...over,
});

const rolesDoc = [
  { __typename: 'Role', id: 'r1', key: 'USER', name: 'User', description: '', is_system: true },
  { __typename: 'Role', id: 'r2', key: 'HOST', name: 'Host', description: 'Runs pods', is_system: false },
  { __typename: 'Role', id: 'r3', key: 'VENUE', name: 'Venue', description: '', is_system: false },
];

/** The hook refetches after every mutation, so USER must be mockable N times.
 * The host-profile lookup runs beside it — most cases have no profile, which is
 * a real answer (holding the HOST role does not create one). */
const userMocks = (times: number, over: Record<string, unknown> = {}): MockedResponse[] => [
  ...Array.from({ length: times }, () => ({
    request: { query: USER, variables: { user_id: USER_ID } },
    result: { data: { user: userDoc(over), roles: rolesDoc } },
  })),
  ...Array.from({ length: Math.max(times, 2) }, () => ({
    request: { query: USER_HOST_PROFILE, variables: { user_id: USER_ID } },
    result: { data: { hostByUser: null } },
  })),
];

const updateMock = (input: Record<string, unknown>, spy?: () => void): MockedResponse => ({
  request: { query: UPDATE_USER, variables: { user_id: USER_ID, input } },
  result: () => {
    spy?.();
    return {
      data: {
        updateUser: {
          __typename: 'User',
          user_id: USER_ID,
          first_name: 'Riya',
          last_name: 'Sharma',
          full_name: 'Riya Sharma',
          email: 'riya@example.com',
          phone_number: '9876543210',
          phone_extension: '+91',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          zone: 'West',
          bio: 'Loves pods',
          profile_photo: '',
          status: 'ACTIVE',
          assigned_city: 'Pune',
          assigned_zones: ['West', 'North'],
        },
      },
    };
  },
});

const validInput = {
  first_name: 'Riya',
  last_name: 'Sharma',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '',
  whatsapp_number: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: ['West', 'North'],
  bio: 'Loves pods',
  profile_photo: undefined,
  status: 'ACTIVE',
  email: 'riya@example.com',
};

const setToast = vi.fn();

const mountHook = async (mocks: MockedResponse[]) => {
  const view = renderHook(() => useUserDetailsState(USER_ID, setToast), { wrapper: makeWrapper(mocks) });
  await waitFor(() => expect(view.result.current.form).not.toBeNull());
  return view;
};

/** Mounts with no route param at all — the "user id missing" branch. */
const mountHookWithoutUser = () =>
  renderHook(() => useUserDetailsState(undefined, setToast), { wrapper: makeWrapper([]) });

beforeEach(() => {
  nav.fn.mockClear();
  setToast.mockClear();
});

describe('useUserDetailsState — hydration', () => {
  it('maps the fetched user onto the edit form, joining assigned zones', async () => {
    const { result } = await mountHook(userMocks(1));

    expect(result.current.form).toMatchObject({
      first_name: 'Riya',
      email: 'riya@example.com',
      assigned_zones: 'West, North',
      status: 'ACTIVE',
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.allRoles).toHaveLength(3);
    expect(result.current.roleByKey.HOST.name).toBe('Host');
  });

  it('falls back to empty strings and ACTIVE for a user with every field unset', async () => {
    const { result } = await mountHook(
      userMocks(1, {
        first_name: null,
        last_name: null,
        email: null,
        phone_extension: null,
        phone_number: null,
        whatsapp_extension: null,
        whatsapp_number: null,
        city: null,
        state: null,
        pincode: null,
        zone: null,
        assigned_city: null,
        assigned_zones: null,
        bio: null,
        profile_photo: null,
        status: null,
        roles: null,
      }),
    );

    expect(result.current.form).toEqual({
      first_name: '',
      last_name: '',
      email: '',
      phone_extension: '',
      phone_number: '',
      whatsapp_extension: '',
      whatsapp_number: '',
      city: '',
      state: '',
      pincode: '',
      zone: '',
      assigned_city: '',
      assigned_zones: '',
      bio: '',
      profile_photo: '',
      status: 'ACTIVE',
    });
    // An all-empty form still matches an all-null user, so nothing is dirty.
    expect(result.current.dirty).toBe(false);

    // A user with no roles at all still gets the implicit USER role ticked.
    act(() => result.current.openRoles());
    expect(Array.from(result.current.selectedRoles)).toEqual(['USER']);
  });

  it('skips the query and leaves the form empty without a user id', () => {
    const { result } = mountHookWithoutUser();

    expect(result.current.form).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.dirty).toBe(false);
  });
});

describe('useUserDetailsState — dirty tracking', () => {
  it('turns dirty once an edited field diverges, and clean again when restored', async () => {
    const { result } = await mountHook(userMocks(1));

    act(() => result.current.setForm((f) => ({ ...(f as EditForm), bio: 'Loves pods a lot' })));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.setForm((f) => ({ ...(f as EditForm), bio: 'Loves pods' })));
    expect(result.current.dirty).toBe(false);
  });

  it('treats a re-joined assigned_zones string as unchanged but a reordered one as dirty', async () => {
    const { result } = await mountHook(userMocks(1));

    act(() => result.current.setForm((f) => ({ ...(f as EditForm), assigned_zones: 'West, North' })));
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setForm((f) => ({ ...(f as EditForm), assigned_zones: 'North, West' })));
    expect(result.current.dirty).toBe(true);
  });
});

describe('useUserDetailsState — save', () => {
  it('validates, sends the mapped UpdateUserInput and toasts on success', async () => {
    const onUpdate = vi.fn();
    const { result } = await mountHook([...userMocks(2), updateMock(validInput, onUpdate)]);

    await act(async () => {
      await result.current.save();
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(setToast).toHaveBeenCalledWith('User updated');
    expect(result.current.opError).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('surfaces the first Zod message and never calls the mutation for an invalid form', async () => {
    const onUpdate = vi.fn();
    const { result } = await mountHook([...userMocks(1), updateMock(validInput, onUpdate)]);

    await act(async () => {
      await result.current.save({ ...(result.current.form as EditForm), first_name: 'R1!' });
    });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(result.current.opError).toMatch(/first name/i);
    expect(setToast).not.toHaveBeenCalled();
  });

  it('surfaces a network failure message from the mutation', async () => {
    const failing: MockedResponse = {
      request: { query: UPDATE_USER, variables: { user_id: USER_ID, input: validInput } },
      error: new Error('Server unreachable'),
    };
    const { result } = await mountHook([...userMocks(1), failing]);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.opError).toBe('Server unreachable');
    expect(setToast).not.toHaveBeenCalled();
  });

  it('is a no-op without a user id — save, setStatus, updatePhoto and delete all bail out', async () => {
    const { result } = mountHookWithoutUser();

    await act(async () => {
      await result.current.save();
      await result.current.setStatus('SUSPENDED');
      await result.current.updatePhoto('https://cdn.test/x.jpg');
      await result.current.saveRoles();
      await result.current.doDelete();
    });

    expect(result.current.busy).toBe(false);
    expect(setToast).not.toHaveBeenCalled();
    expect(nav.fn).not.toHaveBeenCalled();
  });
});

describe('useUserDetailsState — status and photo', () => {
  it('sends the status alone and toasts the human label from STATUS_META', async () => {
    const onUpdate = vi.fn();
    const { result } = await mountHook([
      ...userMocks(2),
      updateMock({ status: 'SUSPENDED' }, onUpdate),
    ]);

    await act(async () => {
      await result.current.setStatus('SUSPENDED');
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(setToast).toHaveBeenCalledWith('Status set to Blocked');
    expect(result.current.form?.status).toBe('SUSPENDED');
  });

  it('reports a status mutation failure without toasting', async () => {
    const { result } = await mountHook([
      ...userMocks(1),
      {
        request: { query: UPDATE_USER, variables: { user_id: USER_ID, input: { status: 'INACTIVE' } } },
        error: new Error('Status locked'),
      },
    ]);

    await act(async () => {
      await result.current.setStatus('INACTIVE');
    });

    expect(result.current.opError).toBe('Status locked');
    expect(result.current.form?.status).toBe('ACTIVE');
  });

  it('nulls a cleared photo on the wire but keeps the empty string in the form', async () => {
    const onUpdate = vi.fn();
    const { result } = await mountHook([
      ...userMocks(2),
      updateMock({ profile_photo: null }, onUpdate),
    ]);

    await act(async () => {
      await result.current.updatePhoto('');
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(setToast).toHaveBeenCalledWith('Profile photo updated');
    expect(result.current.form?.profile_photo).toBe('');
  });

  it('sends a set photo url through unchanged', async () => {
    const onUpdate = vi.fn();
    const { result } = await mountHook([
      ...userMocks(2),
      updateMock({ profile_photo: 'https://cdn.test/riya.jpg' }, onUpdate),
    ]);

    await act(async () => {
      await result.current.updatePhoto('https://cdn.test/riya.jpg');
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.form?.profile_photo).toBe('https://cdn.test/riya.jpg');
  });
});

describe('useUserDetailsState — roles', () => {
  it('opens the dialog seeded with the user roles plus the implicit USER role', async () => {
    const { result } = await mountHook(userMocks(1, { roles: ['HOST'] }));

    act(() => result.current.openRoles());

    expect(result.current.rolesOpen).toBe(true);
    expect(Array.from(result.current.selectedRoles).sort((a, b) => a.localeCompare(b))).toEqual([
      'HOST',
      'USER',
    ]);
  });

  it('toggles a role on and off but refuses to drop USER', async () => {
    const { result } = await mountHook(userMocks(1, { roles: ['HOST'] }));

    act(() => result.current.openRoles());
    act(() => result.current.toggleRole('VENUE'));
    expect(result.current.selectedRoles.has('VENUE')).toBe(true);

    act(() => result.current.toggleRole('VENUE'));
    expect(result.current.selectedRoles.has('VENUE')).toBe(false);

    act(() => result.current.toggleRole('USER'));
    expect(result.current.selectedRoles.has('USER')).toBe(true);
  });

  it('sends the newly ticked role alongside the existing ones, then closes and toasts', async () => {
    const onAssign = vi.fn();
    const assignMock: MockedResponse = {
      request: {
        query: ASSIGN_ROLES,
        variables: { user_id: USER_ID, role_keys: ['USER', 'HOST', 'VENUE'] },
      },
      result: () => {
        onAssign();
        return {
          data: {
            assignUserRoles: {
              __typename: 'User',
              user_id: USER_ID,
              roles: ['USER', 'HOST', 'VENUE'],
            },
          },
        };
      },
    };
    const { result } = await mountHook([...userMocks(2), assignMock]);

    act(() => result.current.openRoles());
    act(() => result.current.toggleRole('VENUE'));
    await act(async () => {
      await result.current.saveRoles();
    });

    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(result.current.rolesOpen).toBe(false);
    expect(setToast).toHaveBeenCalledWith('Roles updated');
  });

  it('adds USER even when the dialog was never opened and nothing is selected', async () => {
    const onAssign = vi.fn();
    const assignMock: MockedResponse = {
      request: { query: ASSIGN_ROLES, variables: { user_id: USER_ID, role_keys: ['USER'] } },
      result: () => {
        onAssign();
        return { data: { assignUserRoles: { __typename: 'User', user_id: USER_ID, roles: ['USER'] } } };
      },
    };
    const { result } = await mountHook([...userMocks(2), assignMock]);

    expect(result.current.selectedRoles.size).toBe(0);
    await act(async () => {
      await result.current.saveRoles();
    });

    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and shows the error when assignment fails', async () => {
    const { result } = await mountHook([
      ...userMocks(1),
      {
        request: { query: ASSIGN_ROLES, variables: { user_id: USER_ID, role_keys: ['USER', 'HOST'] } },
        error: new Error('Role service down'),
      },
    ]);

    act(() => result.current.openRoles());
    await act(async () => {
      await result.current.saveRoles();
    });

    expect(result.current.opError).toBe('Role service down');
    expect(result.current.rolesOpen).toBe(true);
  });
});

describe('useUserDetailsState — delete', () => {
  it('navigates back to the user list after a successful delete', async () => {
    const { result } = await mountHook([
      ...userMocks(1),
      {
        request: { query: DELETE_USER, variables: { user_id: USER_ID } },
        result: { data: { deleteUser: true } },
      },
    ]);

    await act(async () => {
      await result.current.doDelete();
    });

    expect(nav.fn).toHaveBeenCalledWith('/users');
  });

  it('stays on the page and reports the error when delete fails', async () => {
    const { result } = await mountHook([
      ...userMocks(1),
      {
        request: { query: DELETE_USER, variables: { user_id: USER_ID } },
        error: new Error('User has active pods'),
      },
    ]);

    await act(async () => {
      await result.current.doDelete();
    });

    expect(nav.fn).not.toHaveBeenCalled();
    expect(result.current.opError).toBe('User has active pods');
    expect(result.current.busy).toBe(false);
  });
});

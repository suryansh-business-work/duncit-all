import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getUsersColumns } from '../columns';
import type { UserRow } from '../queries';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'CLUB_ADMIN', label: 'Club Admin' },
];

const formatDate = (s: string) => `D(${s})`;
const formatDateTime = (s: string) => `DT(${s})`;

const makeUser = (over: Partial<UserRow> = {}): UserRow => ({
  user_id: 'u1',
  first_name: 'Jane',
  last_name: 'Doe',
  full_name: 'Jane Doe',
  email: 'jane@duncit.test',
  phone_number: '+91 98765 43210',
  roles: ['USER', 'CLUB_ADMIN'],
  profile_photo: null,
  auth_providers: ['EMAIL'],
  last_login_provider: 'EMAIL',
  last_login_at: '2026-03-01T09:00:00.000Z',
  city: 'Pune',
  zone: 'Kothrud',
  status: 'ACTIVE',
  created_at: '2026-01-01T09:00:00.000Z',
  ...over,
});

const buildColumns = () => getUsersColumns({ formatDate, formatDateTime, roleOptions: ROLE_OPTIONS });

const columnBy = (field: string) => {
  const col = buildColumns().find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

const valueOf = (field: string, user: UserRow) => columnBy(field).valueGetter?.(user);

const renderCell = (field: string, user: UserRow) => {
  const col = columnBy(field);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(user)}</>);
};

describe('getUsersColumns / column set', () => {
  it('builds the users grid columns in order', () => {
    expect(buildColumns().map((c) => c.field)).toEqual([
      'first_name',
      'phone_number',
      'roles',
      'role',
      'last_login_provider',
      'status',
      'city',
      'zone',
      'last_login_at',
      'created_at',
    ]);
  });

  it('labels the headers the grid shows', () => {
    expect(Object.fromEntries(buildColumns().map((c) => [c.field, c.headerName]))).toEqual({
      first_name: 'User',
      phone_number: 'Contact',
      roles: 'Roles',
      role: 'Role',
      last_login_provider: 'Login Method',
      status: 'Status',
      city: 'City',
      zone: 'Zone',
      last_login_at: 'Last Login',
      created_at: 'Created',
    });
  });

  it('hides the drill-down-only columns', () => {
    expect(
      buildColumns()
        .filter((c) => c.hide)
        .map((c) => c.field),
    ).toEqual(['role', 'city', 'zone', 'last_login_at']);
  });

  it('feeds the injected role catalog into the Role filter', () => {
    expect(columnBy('role').filter).toEqual({ type: 'select', options: ROLE_OPTIONS });
  });

  it('drops the blank entry from the status filter options', () => {
    expect(columnBy('status').filter).toEqual({
      type: 'select',
      options: [
        { value: 'ACTIVE', label: 'ACTIVE' },
        { value: 'INACTIVE', label: 'INACTIVE' },
        { value: 'SUSPENDED', label: 'SUSPENDED' },
      ],
    });
  });

  it('offers only the two supported login providers as filter options', () => {
    expect(columnBy('last_login_provider').filter).toEqual({
      type: 'select',
      options: [
        { value: 'GOOGLE', label: 'Google' },
        { value: 'EMAIL', label: 'Email' },
      ],
    });
  });
});

describe('getUsersColumns / value getters', () => {
  it('sorts the User column by full name and blanks a missing one', () => {
    expect(valueOf('first_name', makeUser({ full_name: 'Jane Doe' }))).toBe('Jane Doe');
    expect(valueOf('first_name', makeUser({ full_name: null }))).toBe('');
  });

  it('sorts Contact by the phone number and blanks a missing one', () => {
    expect(valueOf('phone_number', makeUser({ phone_number: '+91 12345' }))).toBe('+91 12345');
    expect(valueOf('phone_number', makeUser({ phone_number: null }))).toBe('');
  });

  it('flattens roles into a de-underscored, comma separated string', () => {
    expect(valueOf('roles', makeUser({ roles: ['USER', 'CLUB_ADMIN'] }))).toBe('USER, CLUB ADMIN');
    expect(valueOf('role', makeUser({ roles: ['SUPER_ADMIN'] }))).toBe('SUPER ADMIN');
    expect(valueOf('roles', makeUser({ roles: null }))).toBe('');
  });

  it('derives the login provider label from auth_providers when none was recorded', () => {
    expect(valueOf('last_login_provider', makeUser({ last_login_provider: 'GOOGLE' }))).toBe('Google');
    expect(
      valueOf('last_login_provider', makeUser({ last_login_provider: null, auth_providers: ['GOOGLE'] })),
    ).toBe('Google');
    expect(valueOf('last_login_provider', makeUser({ last_login_provider: null, auth_providers: [] }))).toBe(
      'Email',
    );
  });

  it('defaults a missing status to ACTIVE', () => {
    expect(valueOf('status', makeUser({ status: 'SUSPENDED' }))).toBe('SUSPENDED');
    expect(valueOf('status', makeUser({ status: null }))).toBe('ACTIVE');
  });

  it('routes Last Login through formatDate and Created through formatDateTime', () => {
    expect(valueOf('last_login_at', makeUser({ last_login_at: '2026-03-01T09:00:00.000Z' }))).toBe(
      'D(2026-03-01T09:00:00.000Z)',
    );
    expect(valueOf('last_login_at', makeUser({ last_login_at: null }))).toBe('');
    expect(valueOf('created_at', makeUser({ created_at: '2026-01-01T09:00:00.000Z' }))).toBe(
      'DT(2026-01-01T09:00:00.000Z)',
    );
    expect(valueOf('created_at', makeUser({ created_at: null }))).toBe('');
  });
});

describe('getUsersColumns / cell renderers', () => {
  it('shows the name, email and initials avatar', () => {
    renderCell('first_name', makeUser({ first_name: 'Jane', last_name: 'Doe', profile_photo: null }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@duncit.test')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows the profile photo instead of initials when one exists', () => {
    renderCell('first_name', makeUser({ profile_photo: 'https://cdn.test/jane.png' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/jane.png');
  });

  it('falls back to placeholders for an unnamed, email-less user', () => {
    renderCell('first_name', makeUser({ full_name: '', email: '', first_name: null, last_name: null }));
    expect(screen.getByText('Unnamed user')).toBeInTheDocument();
    expect(screen.getByText('No email')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows the phone number over the city and zone', () => {
    renderCell('phone_number', makeUser({ phone_number: '+91 98765 43210', city: 'Pune', zone: 'Kothrud' }));
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getByText('Pune · Kothrud')).toBeInTheDocument();
  });

  it('dashes a missing phone and reports a missing location', () => {
    renderCell('phone_number', makeUser({ phone_number: null, city: null, zone: null }));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No location')).toBeInTheDocument();
  });

  it('shows only the known half of a partial location', () => {
    renderCell('phone_number', makeUser({ city: 'Pune', zone: null }));
    expect(screen.getByText('Pune')).toBeInTheDocument();
  });

  it('renders one chip per role', () => {
    renderCell('roles', makeUser({ roles: ['USER', 'CLUB_ADMIN'] }));
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('CLUB ADMIN')).toBeInTheDocument();
  });

  it('renders no chips for a user with no roles', () => {
    const { container } = renderCell('roles', makeUser({ roles: null }));
    expect(container).toHaveTextContent('');
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0);
  });

  it('renders the status chip label, defaulting to ACTIVE', () => {
    const suspended = renderCell('status', makeUser({ status: 'SUSPENDED' }));
    expect(suspended.getByText('SUSPENDED')).toBeInTheDocument();
    suspended.unmount();

    const blank = renderCell('status', makeUser({ status: null }));
    expect(blank.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders the login chip with the formatted last-login date', () => {
    renderCell('last_login_provider', makeUser({ last_login_provider: 'GOOGLE', last_login_at: '2026-03-01T09:00:00.000Z' }));
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('D(2026-03-01T09:00:00.000Z)')).toBeInTheDocument();
  });

  it('says the last login is not tracked yet when the user never signed in', () => {
    renderCell('last_login_provider', makeUser({ last_login_provider: null, auth_providers: [], last_login_at: null }));
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Not tracked yet')).toBeInTheDocument();
  });

  it('never calls the date formatters for a user that never signed in', () => {
    const spy = vi.fn((s: string) => `D(${s})`);
    const col = getUsersColumns({ formatDate: spy, formatDateTime, roleOptions: ROLE_OPTIONS }).find(
      (c) => c.field === 'last_login_provider',
    );
    render(<>{col?.cellRenderer?.(makeUser({ last_login_at: null }))}</>);
    expect(spy).not.toHaveBeenCalled();
  });
});

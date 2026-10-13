import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import ClubAdminsPage from '../../../src/club-admins/list/ClubAdminsPage';

const state = vi.hoisted(() => ({
  canGovern: false,
  props: null as Record<string, unknown> | null,
}));

vi.mock('../../../src/shared/useConsoleAccess', () => ({
  useConsoleAccess: () => ({ canGovern: state.canGovern }),
}));
vi.mock('../../../src/shared/ConsoleListPage', () => ({
  default: (props: Record<string, unknown>) => {
    state.props = props;
    return null;
  },
}));

describe('ClubAdminsPage', () => {
  beforeEach(() => {
    state.props = null;
  });

  it('offers Add to a viewer who can govern, since appointing grants CLUB_ADMIN', () => {
    state.canGovern = true;
    render(<ClubAdminsPage />);
    expect(state.props?.addTo).toBe('/club-admins/new');
  });

  it('hides Add from a console-role editor the server would refuse', () => {
    state.canGovern = false;
    render(<ClubAdminsPage />);
    expect(state.props?.addTo).toBeUndefined();
  });

  it('opens a row on its own Club Admin record and sorts newest first', () => {
    state.canGovern = true;
    render(<ClubAdminsPage />);
    const props = state.props as {
      rowPath: (row: { id: string }) => string;
      defaultSortField: string;
      resultKey: string;
    };
    expect(props.rowPath({ id: 'ca-4' })).toBe('/club-admins/ca-4');
    expect(props.defaultSortField).toBe('created_at');
    expect(props.resultKey).toBe('clubAdminProfilesTable');
  });
});

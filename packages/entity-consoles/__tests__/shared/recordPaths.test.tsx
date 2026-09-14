import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  savedRecordPath,
  useRecordEditPath,
  useRecordParentPath,
} from '../../src/shared/recordPaths';

/**
 * A record page resolves its own links from the path it is mounted on, so the
 * same page works at `/hosts/:id` and at `/clubs/:clubId/hosts/:id`.
 */
function PathProbe() {
  return (
    <>
      <span data-testid="edit-path">{useRecordEditPath()}</span>
      <span data-testid="parent-path">{useRecordParentPath()}</span>
    </>
  );
}

const renderAt = (pattern: string, url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={pattern} element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('record paths', () => {
  it('resolves the editor and the list beside a record in its own console', () => {
    renderAt('/club-admins/:clubAdminId', '/club-admins/66f3c4d5e6f708192a3b4c5d');
    expect(screen.getByTestId('edit-path')).toHaveTextContent(
      '/club-admins/66f3c4d5e6f708192a3b4c5d/edit',
    );
    expect(screen.getByTestId('parent-path')).toHaveTextContent('/club-admins');
  });

  it('stays inside the clubs console when the record is nested under a club', () => {
    renderAt(
      '/clubs/:clubId/club-admins/:clubAdminId/edit',
      '/clubs/66c0000000000000000000e1/club-admins/66f3c4d5e6f708192a3b4c5d/edit',
    );
    expect(screen.getByTestId('parent-path')).toHaveTextContent(
      '/clubs/66c0000000000000000000e1/club-admins/66f3c4d5e6f708192a3b4c5d',
    );
  });
});

describe('savedRecordPath', () => {
  it('returns to the record it just edited', () => {
    expect(savedRecordPath('/club-admins/66f3c4d5e6f708192a3b4c5d', true, 'ignored')).toBe(
      '/club-admins/66f3c4d5e6f708192a3b4c5d',
    );
  });

  it('opens the record it just created beside /new', () => {
    expect(savedRecordPath('/club-admins', false, '66f3c4d5e6f708192a3b4c5d')).toBe(
      '/club-admins/66f3c4d5e6f708192a3b4c5d',
    );
  });
});

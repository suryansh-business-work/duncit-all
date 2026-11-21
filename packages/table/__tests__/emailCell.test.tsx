import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmailCell, isEmailField, TableEmailActionProvider, type TableEmailAction } from '../src/cells/emailCell';
import { buildColDefs, TRUNCATE_CELL_CLASS } from '../src/columnDefs';
import { fallbackT } from '../src/i18n';
import type { DuncitColumn } from '../src/types';
import * as api from '../src/index';

const withAction = (action: TableEmailAction | null, node: ReactNode) =>
  render(<TableEmailActionProvider value={action}>{node}</TableEmailActionProvider>);

describe('isEmailField', () => {
  it('matches a field that names one email address, at the top level or nested', () => {
    for (const field of ['email', 'buyer_email', 'user.email', 'Signup_Email', 'contact.user_email']) {
      expect(isEmailField(field)).toBe(true);
    }
  });

  it('leaves out lists, flags and look-alikes', () => {
    for (const field of ['emails', 'email_verified', 'emailed_at', 'name', 'remail', 'gmail']) {
      expect(isEmailField(field)).toBe(false);
    }
  });
});

describe('EmailCell', () => {
  it('is plain text without a provider, as the grid drew it before', () => {
    render(<EmailCell value="asha@example.com" />);
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });

  it('puts the console’s action beside the address, handing it the trimmed value', () => {
    const action = vi.fn((email: string) => <button type="button">validate {email}</button>);
    withAction(action, <EmailCell value="  asha@example.com " />);

    expect(action).toHaveBeenCalledWith('asha@example.com');
    expect(screen.getByRole('button', { name: 'validate asha@example.com' })).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });

  it('shows only the text when the action offers nothing for the value', () => {
    withAction(() => null, <EmailCell value="not an address" />);
    expect(screen.getByText('not an address')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not ask the action about a blank cell', () => {
    const action = vi.fn(() => <span>x</span>);
    withAction(action, <EmailCell value="   " />);
    expect(action).not.toHaveBeenCalled();
  });

  it('draws nothing for a value that is not text', () => {
    const { container } = withAction(() => <span>x</span>, <EmailCell value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('buildColDefs email columns', () => {
  type Row = { email: string; owner_email: string; emails: string[] };
  const columns: DuncitColumn<Row>[] = [
    { field: 'email', headerName: 'Email', type: 'text' },
    { field: 'owner_email', headerName: 'Owner', type: 'text', cellRenderer: (row) => row.owner_email.toUpperCase() },
    { field: 'emails', headerName: 'All', type: 'text' },
  ];

  it('renders a plain email column with EmailCell, keeping its tooltip and ellipsis', () => {
    const [email] = buildColDefs(columns, {}, null, 'asc', fallbackT);
    expect(email.cellRenderer).toBe(EmailCell);
    expect(email.cellClass).toBe(TRUNCATE_CELL_CLASS);
    expect(email.tooltipValueGetter).toBeTypeOf('function');
  });

  it('keeps a column’s own renderer, and leaves non-address fields alone', () => {
    const [, owner, list] = buildColDefs(columns, {}, null, 'asc', fallbackT);
    expect(owner.cellRenderer).not.toBe(EmailCell);
    expect(owner.cellRenderer).toBeTypeOf('function');
    expect(list.cellRenderer).toBeUndefined();
  });

  it('is part of the package’s public surface', () => {
    expect(api.TableEmailActionProvider).toBeTruthy();
    expect(api.isEmailField('email')).toBe(true);
  });
});

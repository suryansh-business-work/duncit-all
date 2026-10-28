import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAmbientDateSettings } from '@duncit/app-settings';
import type { DuncitColumn } from '@duncit/table';
import type { LiteEmailTemplate } from '../../../graphql/email';
import { buildTemplateColumns, templateRowId, templateSearchText } from '../../../pages/email-templates/columns';
import { makeTemplate } from '../../fixtures';
import { portalT } from '../../test-utils';

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const build = () => {
  const handlers = { onEdit: vi.fn(), onSendTest: vi.fn(), onToggle: vi.fn() };
  const columns = buildTemplateColumns(portalT, handlers);
  const column = (field: string): DuncitColumn<LiteEmailTemplate> => {
    const found = columns.find((c) => c.field === field);
    if (!found) throw new Error(`no column ${field}`);
    return found;
  };
  return { handlers, columns, column };
};

describe('email template columns', () => {
  it('keys rows by id and searches name, key and description', () => {
    expect(templateRowId(makeTemplate())).toBe('tpl-1');
    expect(templateSearchText(makeTemplate())).toBe('Registration confirmed registration_confirmed Sent when a guest is confirmed');
  });

  it('heads the columns in English', () => {
    expect(build().columns.map((c) => c.headerName)).toEqual(['Name', 'Key', 'Enabled', 'Sent', 'Updated', 'Actions']);
  });

  it('shows the name over its description and the key as code', () => {
    const { column } = build();
    render(
      <>
        {column('name').cellRenderer?.(makeTemplate())}
        {column('key').cellRenderer?.(makeTemplate())}
      </>,
    );
    expect(screen.getByText('Registration confirmed')).toBeInTheDocument();
    expect(screen.getByText('Sent when a guest is confirmed')).toBeInTheDocument();
    expect(screen.getByText('registration_confirmed')).toBeInTheDocument();
    expect(column('name').valueGetter?.(makeTemplate())).toBe('Registration confirmed');
  });

  it('exports Enabled / Disabled and the last edit date', () => {
    const { column } = build();
    expect(column('enabled').valueGetter?.(makeTemplate({ enabled: true }))).toBe('Enabled');
    expect(column('enabled').valueGetter?.(makeTemplate({ enabled: false }))).toBe('Disabled');
    expect(column('updated_at').valueGetter?.(makeTemplate())).toBe('2026-03-05');
  });

  it('switches a template off from its labelled switch', async () => {
    const user = userEvent.setup();
    const { column, handlers } = build();
    const row = makeTemplate();
    render(<>{column('enabled').cellRenderer?.(row)}</>);
    const toggle = screen.getByRole('switch', { name: 'Enable Registration confirmed' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(handlers.onToggle).toHaveBeenCalledWith(row, false);
  });

  it('wires Edit and Send a test to the row', async () => {
    const user = userEvent.setup();
    const { column, handlers } = build();
    const row = makeTemplate();
    render(<>{column('actions').cellRenderer?.(row)}</>);
    await user.click(screen.getByRole('button', { name: 'Edit Registration confirmed' }));
    await user.click(screen.getByRole('button', { name: 'Send a test of Registration confirmed' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(row);
    expect(handlers.onSendTest).toHaveBeenCalledWith(row);
  });
});

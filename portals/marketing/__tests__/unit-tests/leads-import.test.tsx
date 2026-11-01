import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { importLeadsErrorMock, importLeadsMock, makeImportResult } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import { useTranslation } from '@duncit/app-settings';
import { parseCsv, splitHeader } from '../../src/pages/leads-page/import-csv/csv';
import { badRows, emptyMapping, guessMapping, rowProblem, toServerMapping } from '../../src/pages/leads-page/import-csv/importMapping';
import ImportCsvDialog from '../../src/pages/leads-page/import-csv/ImportCsvDialog';

afterEach(() => {
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;

describe('parseCsv', () => {
  it('reads plain rows, quoted cells with commas, quotes and line breaks, CRLF, a BOM and a trailing newline', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('﻿name,note\r\n"Blue, Cafe","She said ""hi""\nthen left"\r\n')).toEqual([
      ['name', 'note'],
      ['Blue, Cafe', 'She said "hi"\nthen left'],
    ]);
    expect(parseCsv(' spaced , cells ')).toEqual([['spaced', 'cells']]);
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
    expect(parseCsv('""')).toEqual([]);
    expect(parseCsv('a\n\n\nb')).toEqual([['a'], ['b']]);
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('x"y')).toEqual([['x"y']]);
  });

  it('splits the header from the rows, and copes with a file that has only a header or nothing', () => {
    expect(splitHeader([['name'], ['Blue']])).toEqual({ header: ['name'], body: [['Blue']] });
    expect(splitHeader([['name']])).toEqual({ header: ['name'], body: [] });
    expect(splitHeader([])).toEqual({ header: [], body: [] });
  });
});

describe('mapping', () => {
  it('guesses each field from the header, never giving two fields one column', () => {
    expect(guessMapping(['Business name', 'Owner name', 'Email address', 'WhatsApp', 'Website', 'IG handle', 'City', 'Tags'])).toEqual({
      name: 1,
      company: 0,
      email: 2,
      phone: 3,
      website: 4,
      instagram_handle: 5,
      city: 6,
      tags: 7,
    });
    expect(guessMapping(['Name', 'Instagram'])).toEqual({ ...emptyMapping(), name: 0, instagram_handle: 1 });
    expect(guessMapping([])).toEqual(emptyMapping());
  });

  it('sends only the mapped columns to the server, with the pipeline', () => {
    expect(toServerMapping({ ...emptyMapping(), name: 0, email: 2 }, 'VENUE')).toEqual({ name: 0, email: 2, pipeline: 'VENUE' });
    expect(toServerMapping(emptyMapping(), 'GENERAL')).toEqual({ name: -1, pipeline: 'GENERAL' });
  });

  it('checks each row the way the server will, and names the rows that will be skipped', () => {
    const { t } = translator();
    const mapping = { ...emptyMapping(), name: 0, email: 1, phone: 2, website: 3, instagram_handle: 4 };
    expect(rowProblem(['', '', '', '', ''], mapping, t)).toBe('No name');
    expect(rowProblem(['Cafe', 'nope', '', '', ''], mapping, t)).toBe('"nope" is not an email address');
    expect(rowProblem(['Cafe', 'a@b.in; c@d.in', '12', '', ''], mapping, t)).toBe('"12" is not a phone number');
    expect(rowProblem(['Cafe', '', '+91 98765-43210', 'not a site', ''], mapping, t)).toBe('"not a site" is not a web address');
    expect(rowProblem(['Cafe', '', '', 'https://cafe.in/x', 'bad handle!'], mapping, t)).toBe('"bad handle!" is not an Instagram handle');
    expect(rowProblem(['Cafe', '', '', 'cafe.in', '@cafe.pune'], mapping, t)).toBe('');
    expect(rowProblem(['Cafe', 'garbage'], { ...emptyMapping(), name: 0 }, t)).toBe('');
    expect(badRows([['Cafe'], [''], ['X', 'bad']], mapping, t)).toEqual([
      { row: 2, problem: 'No name' },
      { row: 3, problem: '"bad" is not an email address' },
    ]);
  });
});

describe('ImportCsvDialog', () => {
  const csv = 'Name,Email,Phone\nBlue Cafe,hi@bluecafe.in,+91 98765 43210\nRani Events,rani@events.in,9123456789\nBad,,12\n';
  const rows = [
    ['Blue Cafe', 'hi@bluecafe.in', '+91 98765 43210'],
    ['Rani Events', 'rani@events.in', '9123456789'],
    ['Bad', '', '12'],
  ];
  const mapping = { name: 0, email: 1, phone: 2, pipeline: 'VENUE' as const };

  const pick = (name: string, text: string) => {
    const file = new File([text], name, { type: 'text/csv' });
    fireEvent.change(screen.getByTestId('import-file'), { target: { files: [file] } });
  };

  it('refuses a file that is not a CSV, one with no rows, and one with too many', async () => {
    renderWithProviders(<ImportCsvDialog open onClose={vi.fn()} onImported={vi.fn()} />);
    expect(screen.getByTestId('import-submit')).toBeDisabled();
    pick('leads.xlsx', 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick a .csv file.');
    pick('leads.csv', 'Name\n');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The file has no rows under its header.'));
    pick('big.csv', `Name\n${Array.from({ length: 2001 }, (_unused, i) => `Lead ${i}`).join('\n')}`);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Keep the file under 2000 rows.'));
    expect(screen.queryByTestId('import-mapping')).not.toBeInTheDocument();
  });

  it('says when the browser could not read the file', async () => {
    const RealReader = globalThis.FileReader;
    class FailingReader {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      error = new Error('disk');
      result = null;
      readAsText() {
        this.onerror?.();
      }
    }
    globalThis.FileReader = FailingReader as unknown as typeof FileReader;
    try {
      renderWithProviders(<ImportCsvDialog open onClose={vi.fn()} onImported={vi.fn()} />);
      pick('leads.csv', csv);
      expect(await screen.findByRole('alert')).toHaveTextContent('The file could not be read. Try choosing it again.');
      expect(screen.queryByTestId('import-file-read')).not.toBeInTheDocument();
    } finally {
      globalThis.FileReader = RealReader;
    }
  });

  it('reads the file, guesses the columns, previews the rows and the ones to skip, imports, and shows the outcome', async () => {
    const onImported = vi.fn();
    renderWithProviders(<ImportCsvDialog open onClose={vi.fn()} onImported={onImported} />, {
      mocks: [importLeadsMock(rows, mapping, makeImportResult())],
    });
    pick('leads.csv', csv);
    expect(await screen.findByTestId('import-file-read')).toHaveTextContent('3 rows found in leads.csv.');
    expect(screen.getByTestId('import-map-name')).toHaveValue('0');
    expect(screen.getByTestId('import-map-email')).toHaveValue('1');
    expect(screen.getByTestId('import-map-phone')).toHaveValue('2');
    expect(screen.getByTestId('import-map-city')).toHaveValue('');
    const preview = screen.getByTestId('import-preview');
    expect(within(preview).getAllByRole('row')).toHaveLength(4);
    expect(within(preview).getByRole('columnheader', { name: 'Phone' })).toBeInTheDocument();
    expect(screen.getByTestId('import-bad-rows')).toHaveTextContent('1 rows will be skipped');
    expect(screen.getByTestId('import-bad-rows')).toHaveTextContent('Row 3 · "12" is not a phone number');

    fireEvent.change(screen.getByTestId('import-pipeline'), { target: { value: 'VENUE' } });
    expect(screen.getByRole('button', { name: 'Import 3 rows' })).toBeEnabled();
    fireEvent.click(screen.getByTestId('import-submit'));
    const result = await screen.findByTestId('import-result');
    expect(result).toHaveTextContent('1 added, 1 merged, 1 skipped.');
    expect(within(result).getByRole('link', { name: 'See the run on Activity' })).toHaveAttribute('href', '/activity?workflow=LEAD_IMPORT');
    expect(result).toHaveTextContent('Row 3 · "12" is not a phone number');
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('import-submit')).not.toBeInTheDocument();
  });

  it('lets the person remap a column and says when every row is usable, and blocks import without a name column', async () => {
    renderWithProviders(<ImportCsvDialog open onClose={vi.fn()} onImported={vi.fn()} />);
    pick('leads.csv', 'Contact,Business\nhi@cafe.in,Blue Cafe\n');
    await screen.findByTestId('import-file-read');
    expect(screen.getByTestId('import-map-name')).toHaveValue('');
    expect(screen.getByTestId('import-submit')).toBeDisabled();
    expect(screen.getByTestId('import-bad-rows')).toHaveTextContent('No name');
    fireEvent.change(screen.getByTestId('import-map-name'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('import-map-email'), { target: { value: '0' } });
    expect(screen.getByText('Every row looks usable.')).toBeInTheDocument();
    expect(screen.getByTestId('import-submit')).toBeEnabled();
    fireEvent.change(screen.getByTestId('import-map-email'), { target: { value: '' } });
    expect(screen.getByTestId('import-map-email')).toHaveValue('');
  });

  it('reports a refused import and keeps the file, and clears everything on close', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ImportCsvDialog open onClose={onClose} onImported={vi.fn()} />, {
      mocks: [importLeadsErrorMock(rows, { ...mapping, pipeline: 'GENERAL' }, 'Import at most 2000 rows')],
    });
    pick('leads.csv', csv);
    await screen.findByTestId('import-file-read');
    fireEvent.click(screen.getByTestId('import-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Import at most 2000 rows', 'error'));
    expect(screen.getByTestId('import-file-read')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('import-file-read')).not.toBeInTheDocument());
  });
});

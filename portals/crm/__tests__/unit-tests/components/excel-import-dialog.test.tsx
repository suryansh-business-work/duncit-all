import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import ExcelImportDialog from '@/components/ExcelImportDialog';

// These documents are private to the dialog; the mocks must match them
// character for character (after whitespace normalisation), so they are
// restated here exactly as the component declares them.
const INSPECT = gql`
  query CrmExcelInspect($content_base64: String!) {
    crmExcelInspect(content_base64: $content_base64) { headers sample_rows }
  }
`;
const IMPORT = gql`
  mutation CrmExcelImport($entity: CrmAiEntity!, $content_base64: String!, $mapping: [CrmImportMappingInput!]) {
    crmExcelImport(entity: $entity, content_base64: $content_base64, mapping: $mapping) {
      inserted failed errors { row message }
    }
  }
`;

const CONTENT = 'a,b';
const CONTENT_B64 = btoa(CONTENT);

const inspectMock = (headers: string[], delay = 0): MockedResponse => ({
  request: { query: INSPECT, variables: { content_base64: CONTENT_B64 } },
  result: { data: { crmExcelInspect: { __typename: 'CrmExcelInspect', headers, sample_rows: [] } } },
  delay,
});

const importMock = (
  entity: 'VENUE_LEAD' | 'HOST_LEAD',
  mapping: Array<{ field: string; header: string }>,
  payload: { inserted: number; failed: number; errors: Array<{ row: number; message: string }> } | null,
): MockedResponse => ({
  request: { query: IMPORT, variables: { entity, content_base64: CONTENT_B64, mapping } },
  result: {
    data: {
      crmExcelImport: payload && {
        __typename: 'CrmExcelImportResult',
        ...payload,
        errors: payload.errors.map((e) => ({ __typename: 'CrmExcelImportError', ...e })),
      },
    },
  },
});

function mount(opts: { entity?: 'VENUE_LEAD' | 'HOST_LEAD'; mocks?: MockedResponse[]; template?: boolean } = {}) {
  const { entity = 'VENUE_LEAD', mocks = [], template = false } = opts;
  const props = {
    onClose: vi.fn(),
    onImported: vi.fn(),
    onDownloadTemplate: vi.fn(),
  };
  renderWithApollo(
    <ExcelImportDialog
      open
      entity={entity}
      title="Import venues"
      onClose={props.onClose}
      onImported={props.onImported}
      onDownloadTemplate={template ? props.onDownloadTemplate : undefined}
    />,
    mocks,
  );
  return props;
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const choose = (name = 'leads.csv') =>
  fireEvent.change(fileInput(), { target: { files: [new File([CONTENT], name, { type: 'text/csv' })] } });
const importButton = () => screen.getByRole('button', { name: /^import$/i });

describe('ExcelImportDialog file step', () => {
  it('asks for a file and has no template button unless one is provided', () => {
    mount();
    expect(screen.getByText('Import venues')).toBeInTheDocument();
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download template/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^import$/i })).not.toBeInTheDocument();
  });

  it('offers the template download when given', () => {
    const { onDownloadTemplate } = mount({ template: true });
    fireEvent.click(screen.getByRole('button', { name: /download template/i }));
    expect(onDownloadTemplate).toHaveBeenCalledTimes(1);
  });

  it('opens the native picker from Choose file', () => {
    mount();
    const click = vi.spyOn(fileInput(), 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    expect(click).toHaveBeenCalled();
  });

  it('ignores a change event that carries no file', () => {
    mount();
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows Reading… and locks Close while the file is inspected', async () => {
    mount({ mocks: [inspectMock(['venue_name'], 40)] });
    choose();
    expect(await screen.findByRole('button', { name: 'Reading…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: /^import$/i })).toBeInTheDocument();
  });

  it('reports a file with no header row', async () => {
    mount({ mocks: [inspectMock([])] });
    choose();
    expect(await screen.findByRole('alert')).toHaveTextContent('No column headers found in the first row.');
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeEnabled();
  });

  it('reports a server error while reading the file', async () => {
    mount({
      mocks: [
        {
          request: { query: INSPECT, variables: { content_base64: CONTENT_B64 } },
          result: { errors: [new GraphQLError('Unsupported file type')] },
        },
      ],
    });
    choose();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported file type');
  });
});

describe('ExcelImportDialog mapping and import', () => {
  it('maps what it can by header name and blocks the import while a required field is unmapped', async () => {
    mount({
      mocks: [
        inspectMock(['venue_name', 'City', 'Notes']),
      ],
    });
    choose();
    await screen.findByText(/Match each lead field to a column/);
    // full_address is required and has no matching header, so import is blocked.
    expect(importButton()).toBeDisabled();
    expect(screen.getAllByText('required')).toHaveLength(3);
  });

  it('imports once every required field is mapped', async () => {
    const { onImported } = mount({
      mocks: [
        inspectMock(['venue_name', 'City', 'full_address']),
        importMock(
          'VENUE_LEAD',
          [
            { field: 'venue_name', header: 'venue_name' },
            { field: 'city', header: 'City' },
            { field: 'full_address', header: 'full_address' },
          ],
          { inserted: 2, failed: 1, errors: [{ row: 4, message: 'Missing address' }] },
        ),
      ],
    });
    choose('venues.csv');
    await screen.findByText(/Match each lead field to a column/);
    expect(importButton()).toBeEnabled();
    fireEvent.click(importButton());
    expect(await screen.findByText(/Imported 2 of 3 rows/)).toBeInTheDocument();
    expect(screen.getByText('Missing address')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledWith({ inserted: 2, failed: 1 });
    expect(screen.queryByRole('button', { name: /^import$/i })).not.toBeInTheDocument();
  });

  it('uses the host fields for a host import', async () => {
    const { onImported } = mount({
      entity: 'HOST_LEAD',
      mocks: [
        inspectMock(['Host name', 'city']),
        importMock(
          'HOST_LEAD',
          [{ field: 'host_name', header: 'Host name' }, { field: 'city', header: 'city' }],
          { inserted: 1, failed: 0, errors: [] },
        ),
      ],
    });
    choose();
    await screen.findByText(/Match each lead field to a column/);
    expect(screen.getAllByText('required')).toHaveLength(1);
    fireEvent.click(importButton());
    expect(await screen.findByText('Imported 1 of 1 rows')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledWith({ inserted: 1, failed: 0 });
  });

  it('shows the error when the import mutation fails and lets the agent retry', async () => {
    const { onImported } = mount({
      entity: 'HOST_LEAD',
      mocks: [
        inspectMock(['host_name']),
        {
          request: {
            query: IMPORT,
            variables: { entity: 'HOST_LEAD', content_base64: CONTENT_B64, mapping: [{ field: 'host_name', header: 'host_name' }] },
          },
          result: { errors: [new GraphQLError('Import crashed')] },
        },
      ],
    });
    choose();
    await screen.findByText(/Match each lead field to a column/);
    fireEvent.click(importButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Import crashed');
    expect(onImported).not.toHaveBeenCalled();
    expect(importButton()).toBeEnabled();
  });

  it('reports an import that returns nothing', async () => {
    mount({
      entity: 'HOST_LEAD',
      mocks: [
        inspectMock(['host_name']),
        importMock('HOST_LEAD', [{ field: 'host_name', header: 'host_name' }], null),
      ],
    });
    choose();
    await screen.findByText(/Match each lead field to a column/);
    fireEvent.click(importButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Import returned no payload');
  });

  it('resets and closes', async () => {
    const { onClose } = mount({ entity: 'HOST_LEAD', mocks: [inspectMock(['host_name'])] });
    choose('hosts.csv');
    await screen.findByText(/Match each lead field to a column/);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('No file selected')).toBeInTheDocument());
  });
});

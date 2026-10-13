import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { CREATE_HOST_LEAD, CREATE_VENUE_LEAD } from '@/api/crm.gql';
import { recordToRow, rowToInput } from '@/components/ai-records/aiLeadInput';

// The editable grid has its own suite; here it is a double that shows each
// row's name and issue and can edit the first row, so the dialog's own
// parse / validate / bulk-create flow is what runs.
vi.mock('@/components/ai-records/AiRecordsTable', () => ({
  default: ({
    rows,
    onChange,
  }: {
    rows: Array<{ _id: number; name: string; _error?: string }>;
    onChange: (rows: unknown[]) => void;
  }) => (
    <div>
      {rows.map((row) => (
        <p key={row._id} data-testid={`row-${row._id}`}>
          {row.name || '(blank)'} | {row._error ?? 'ok'}
        </p>
      ))}
      <button type="button" onClick={() => onChange(rows.map((r, i) => (i === 0 ? { ...r, name: 'Edited name' } : r)))}>
        edit first
      </button>
      <button type="button" onClick={() => onChange(rows.map((r, i) => (i === 0 ? { ...r, name: '' } : r)))}>
        blank first
      </button>
    </div>
  ),
}));

import FillWithAiDialog from '@/components/FillWithAiDialog';

const AI_PARSE = gql`
  mutation AiParseCrmLeads($entity: CrmAiEntity!, $text: String!) {
    aiParseCrmLeads(entity: $entity, text: $text)
  }
`;

const venueA = { venue_name: 'Court A', city: 'Pune', full_address: '1 Main Rd' };
const venueB = { venue_name: 'Court B', city: 'Mumbai', full_address: '2 Main Rd' };
const hostA = { host_name: 'Asha', city: 'Delhi' };

const parseMock = (entity: 'VENUE_LEAD' | 'HOST_LEAD', text: string, raw: unknown): MockedResponse => ({
  request: { query: AI_PARSE, variables: { entity, text } },
  result: { data: { aiParseCrmLeads: raw } },
});

const createVenueMock = (record: Record<string, unknown>, index = 0, error?: string): MockedResponse => ({
  request: {
    query: CREATE_VENUE_LEAD,
    variables: { input: rowToInput(recordToRow(record, 'VENUE_LEAD', index), 'VENUE_LEAD') },
  },
  ...(error
    ? { result: { errors: [new GraphQLError(error)] } }
    : { result: { data: { createVenueLead: { __typename: 'VenueLead', id: `v${index}` } } } }),
});

function mount(opts: { entity?: 'VENUE_LEAD' | 'HOST_LEAD'; mocks?: MockedResponse[] } = {}) {
  const { entity = 'VENUE_LEAD', mocks = [] } = opts;
  const props = { onClose: vi.fn(), onSaved: vi.fn() };
  renderWithApollo(<FillWithAiDialog open entity={entity} title="Fill with AI" {...props} />, mocks);
  return props;
}

const type = (value: string) => fireEvent.change(screen.getByLabelText('Paste text here'), { target: { value } });
const parseButton = () => screen.getByRole('button', { name: 'Parse' });
const confirm = (n: number) => screen.getByRole('button', { name: `Confirm & save ${n}` });

describe('FillWithAiDialog input step', () => {
  it('describes what to paste for venues and for hosts', () => {
    mount();
    expect(screen.getByText(/Paste text describing one or more venues/)).toBeInTheDocument();
  });

  it('describes hosts for a host dialog', () => {
    mount({ entity: 'HOST_LEAD' });
    expect(screen.getByText(/Paste text describing one or more hosts/)).toBeInTheDocument();
  });

  it('will not parse empty or blank text', () => {
    mount();
    fireEvent.click(parseButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Paste some text to parse first.');
    type('   ');
    fireEvent.click(parseButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Paste some text to parse first.');
  });

  it('shows Parsing… while the model works', async () => {
    mount({ mocks: [{ ...parseMock('VENUE_LEAD', 'two courts', JSON.stringify([venueA])), delay: 40 }] });
    type('two courts');
    fireEvent.click(parseButton());
    expect(await screen.findByRole('button', { name: 'Parsing…' })).toBeDisabled();
    expect(await screen.findByText('1 record found. Edit any cell, then Confirm & save.')).toBeInTheDocument();
  });

  it('reads a bare array of records into the review step', async () => {
    mount({ mocks: [parseMock('VENUE_LEAD', 'courts', JSON.stringify([venueA, venueB]))] });
    type('courts');
    fireEvent.click(parseButton());
    expect(await screen.findByText('2 records found. Edit any cell, then Confirm & save.')).toBeInTheDocument();
    expect(screen.getByTestId('row-0')).toHaveTextContent('Court A | ok');
    expect(screen.getByTestId('row-1')).toHaveTextContent('Court B | ok');
    expect(confirm(2)).toBeEnabled();
  });

  it('reads records wrapped in an object', async () => {
    mount({ mocks: [parseMock('VENUE_LEAD', 'courts', JSON.stringify({ records: [venueA] }))] });
    type('courts');
    fireEvent.click(parseButton());
    expect(await screen.findByTestId('row-0')).toHaveTextContent('Court A');
  });

  it('says nothing was found when the object has no records', async () => {
    mount({ mocks: [parseMock('VENUE_LEAD', 'nothing', JSON.stringify({}))] });
    type('nothing');
    fireEvent.click(parseButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('No leads found in that text. Add more detail and retry.');
  });

  it('says nothing was found when the model returned nothing at all', async () => {
    mount({ mocks: [parseMock('VENUE_LEAD', 'nothing', null)] });
    type('nothing');
    fireEvent.click(parseButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('No leads found in that text');
  });

  it('shows an error when the model returns something that is not JSON', async () => {
    mount({ mocks: [parseMock('VENUE_LEAD', 'junk', 'definitely { not json')] });
    type('junk');
    fireEvent.click(parseButton());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/records? found/)).not.toBeInTheDocument();
  });

  it('shows the API error', async () => {
    mount({
      mocks: [
        {
          request: { query: AI_PARSE, variables: { entity: 'VENUE_LEAD', text: 'x' } },
          result: { errors: [new GraphQLError('AI is rate limited')] },
        },
      ],
    });
    type('x');
    fireEvent.click(parseButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('AI is rate limited');
  });

  it('closes from Cancel and forgets the text', () => {
    const { onClose } = mount();
    type('something');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FillWithAiDialog review and save', () => {
  const toReview = async (records: unknown[], entity: 'VENUE_LEAD' | 'HOST_LEAD', mocks: MockedResponse[]) => {
    const props = mount({ entity, mocks: [parseMock(entity, 'paste', JSON.stringify(records)), ...mocks] });
    type('paste');
    fireEvent.click(parseButton());
    await screen.findByText(/records? found/);
    return props;
  };

  it('can go back to the text step', async () => {
    await toReview([venueA], 'VENUE_LEAD', []);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Paste text here')).toHaveValue('paste');
  });

  it('creates every row, reports the count and closes', async () => {
    const { onSaved, onClose } = await toReview([venueA, venueB], 'VENUE_LEAD', [
      createVenueMock(venueA, 0),
      createVenueMock(venueB, 1),
    ]);
    fireEvent.click(confirm(2));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(2));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('saves an edited row with the edit', async () => {
    const { onSaved } = await toReview([venueA], 'VENUE_LEAD', [createVenueMock({ ...venueA, venue_name: 'Edited name' }, 0)]);
    fireEvent.click(screen.getByText('edit first'));
    expect(screen.getByTestId('row-0')).toHaveTextContent('Edited name');
    fireEvent.click(confirm(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1));
  });

  it('keeps an invalid row for fixing, saves the rest and says how many need attention', async () => {
    const { onSaved, onClose } = await toReview([venueA, venueB], 'VENUE_LEAD', [createVenueMock(venueB, 1)]);
    fireEvent.click(screen.getByText('blank first'));
    fireEvent.click(confirm(2));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('1 created · 1 need fixing (see Issue column).');
    expect(screen.getByTestId('row-0')).toHaveTextContent('(blank) | Name is required');
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps a row whose create failed on the server with the reason', async () => {
    const { onSaved, onClose } = await toReview([venueA], 'VENUE_LEAD', [
      createVenueMock(venueA, 0, 'Duplicate venue'),
    ]);
    fireEvent.click(confirm(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('0 created · 1 need fixing');
    expect(screen.getByTestId('row-0')).toHaveTextContent('Court A | Duplicate venue');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('creates host leads through the host mutation', async () => {
    const { onSaved } = await toReview([hostA], 'HOST_LEAD', [
      {
        request: {
          query: CREATE_HOST_LEAD,
          variables: { input: rowToInput(recordToRow(hostA, 'HOST_LEAD', 0), 'HOST_LEAD') },
        },
        result: { data: { createHostLead: { __typename: 'HostLead', id: 'h1' } } },
      },
    ]);
    fireEvent.click(confirm(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1));
  });

  it('closes from Cancel on the review step', async () => {
    const { onClose } = await toReview([venueA], 'VENUE_LEAD', []);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

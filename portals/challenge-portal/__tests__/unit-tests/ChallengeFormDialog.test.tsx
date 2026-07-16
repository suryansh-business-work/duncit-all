import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const useMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: useMutationMock,
}));

interface CascadeValue {
  superId: string;
  categoryId: string;
  subId: string;
}
vi.mock('../../src/pages/challenges/CategoryCascade', () => ({
  default: ({ value, onChange }: { value: CascadeValue; onChange: (v: CascadeValue) => void }) => (
    <div>
      <span data-testid="cascade">{`${value.superId}|${value.categoryId}|${value.subId}`}</span>
      <button
        type="button"
        onClick={() => onChange({ superId: 'sp', categoryId: 'cat', subId: 'sub' })}
      >
        set-cascade
      </button>
    </div>
  ),
}));

import ChallengeFormDialog from '../../src/pages/challenges/ChallengeFormDialog';
import { CREATE_CHALLENGE } from '../../src/graphql/challenges';

const createFn = vi.fn();
const updateFn = vi.fn();
let createState: { loading: boolean; error?: { message: string } };
let updateState: { loading: boolean; error?: { message: string } };

const wireMutations = () => {
  useMutationMock.mockImplementation((doc: unknown) =>
    doc === CREATE_CHALLENGE ? [createFn, createState] : [updateFn, updateState],
  );
};

const editing = {
  id: 'ch1',
  name: 'Existing',
  description: 'Desc',
  super_category_id: 'S',
  category_id: 'C',
  sub_category_id: 'SUB',
  is_active: true,
  created_at: '2026-01-01',
};

describe('ChallengeFormDialog', () => {
  beforeEach(() => {
    createFn.mockReset().mockResolvedValue({});
    updateFn.mockReset().mockResolvedValue({});
    createState = { loading: false, error: undefined };
    updateState = { loading: false, error: undefined };
    wireMutations();
  });

  it('creates a new challenge from entered values + cascade, then saves and closes', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<ChallengeFormDialog open editing={null} onClose={onClose} onSaved={onSaved} />);

    expect(screen.getByText('New challenge')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Challenge name/), { target: { value: '  Run 5k  ' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'do it' } });
    fireEvent.click(screen.getByText('set-cascade'));

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1));
    expect(createFn).toHaveBeenCalledWith({
      variables: {
        input: {
          name: 'Run 5k',
          description: 'do it',
          super_category_id: 'sp',
          category_id: 'cat',
          sub_category_id: 'sub',
        },
      },
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('prefills from the editing challenge and updates it, nulling out empty scope ids', async () => {
    const blankEdit = { ...editing, super_category_id: null, category_id: null, sub_category_id: null };
    const onClose = vi.fn();
    render(<ChallengeFormDialog open editing={blankEdit} onClose={onClose} />);

    expect(screen.getByText('Edit challenge')).toBeInTheDocument();
    expect(screen.getByLabelText(/Challenge name/)).toHaveValue('Existing');
    expect(screen.getByTestId('cascade')).toHaveTextContent('||');

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(updateFn).toHaveBeenCalledTimes(1));
    expect(updateFn).toHaveBeenCalledWith({
      variables: {
        id: 'ch1',
        input: {
          name: 'Existing',
          description: 'Desc',
          super_category_id: null,
          category_id: null,
          sub_category_id: null,
        },
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prefills the cascade ids when editing a scoped challenge', () => {
    render(<ChallengeFormDialog open editing={editing} onClose={vi.fn()} />);
    expect(screen.getByTestId('cascade')).toHaveTextContent('S|C|SUB');
  });

  it('shows the create mutation error and a saving state', () => {
    createState = { loading: true, error: { message: 'create boom' } };
    wireMutations();
    render(<ChallengeFormDialog open editing={null} onClose={vi.fn()} />);
    expect(screen.getByText('create boom')).toBeInTheDocument();
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByText('Saving…').closest('button')).toBeDisabled();
  });

  it('falls back to the update mutation error + loading when editing', () => {
    updateState = { loading: true, error: { message: 'update boom' } };
    wireMutations();
    render(<ChallengeFormDialog open editing={editing} onClose={vi.fn()} />);
    expect(screen.getByText('update boom')).toBeInTheDocument();
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('does not prefill while closed (effect early-returns)', () => {
    const { queryByText } = render(<ChallengeFormDialog open={false} editing={editing} onClose={vi.fn()} />);
    // Dialog content is not mounted while closed.
    expect(queryByText('Edit challenge')).not.toBeInTheDocument();
  });

  it('Cancel closes the dialog', () => {
    const onClose = vi.fn();
    render(<ChallengeFormDialog open editing={null} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

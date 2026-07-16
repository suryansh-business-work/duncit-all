import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PodEditorDialog, { type PodEditorDialogProps } from '../../src/editor/PodEditorDialog';
import { blankPodFormValues } from '../../src/types';
import { makeConfig } from './helpers';

vi.mock('../../src/PodForm', () => ({
  default: (props: { error: string | null }) => <div data-testid="podform">error:{props.error ?? 'none'}</div>,
}));

const baseProps = (over: Partial<PodEditorDialogProps> = {}): PodEditorDialogProps => ({
  open: true,
  editing: false,
  onClose: vi.fn(),
  initialValues: blankPodFormValues,
  config: makeConfig(),
  busy: false,
  error: null,
  clubs: [],
  venues: [],
  getClubVenueIds: () => [],
  onSubmit: vi.fn(),
  ...over,
});

describe('PodEditorDialog', () => {
  it('renders the New Pod title and the form when creating', () => {
    render(<PodEditorDialog {...baseProps()} />);
    expect(screen.getByText('New Pod')).toBeInTheDocument();
    expect(screen.getByTestId('podform')).toHaveTextContent('error:none');
  });

  it('renders the Edit Pod title when editing', () => {
    render(<PodEditorDialog {...baseProps({ editing: true })} />);
    expect(screen.getByText('Edit Pod')).toBeInTheDocument();
  });

  it('renders title extras and an intro region', () => {
    render(
      <PodEditorDialog
        {...baseProps({
          titleExtras: <button type="button">AI Fill</button>,
          intro: <p>Host info</p>,
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'AI Fill' })).toBeInTheDocument();
    expect(screen.getByText('Host info')).toBeInTheDocument();
  });

  it('passes the error through to the form', () => {
    render(<PodEditorDialog {...baseProps({ error: 'Boom' })} />);
    expect(screen.getByTestId('podform')).toHaveTextContent('error:Boom');
  });

  it('renders nothing when closed', () => {
    render(<PodEditorDialog {...baseProps({ open: false })} />);
    expect(screen.queryByText('New Pod')).not.toBeInTheDocument();
    expect(screen.queryByTestId('podform')).not.toBeInTheDocument();
  });
});

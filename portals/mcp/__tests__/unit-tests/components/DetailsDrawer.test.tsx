import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DetailsDrawer from '../../../src/components/DetailsDrawer';

describe('DetailsDrawer', () => {
  it('is a dialog named by its heading, with the subtitle under it', () => {
    render(
      <DetailsDrawer open title="pods_create_pod" subtitle="Create the Sunday pod" onClose={vi.fn()}>
        <p>body</p>
      </DetailsDrawer>,
    );
    const dialog = screen.getByRole('dialog', { name: 'pods_create_pod' });
    expect(dialog).toHaveTextContent('Create the Sunday pod');
    expect(dialog).toHaveTextContent('body');
    expect(screen.getByRole('heading', { level: 2, name: 'pods_create_pod' })).toBeInTheDocument();
  });

  it('closes from its close button', () => {
    const onClose = vi.fn();
    render(
      <DetailsDrawer open title="A tool" onClose={onClose}>
        <p>body</p>
      </DetailsDrawer>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('draws nothing while closed', () => {
    render(
      <DetailsDrawer open={false} title="A tool" onClose={vi.fn()}>
        <p>body</p>
      </DetailsDrawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });
});

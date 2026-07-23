import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodContentFormDialog from '../src/PodContentFormDialog';
import type { PodContentValues, PodField, ReadOnlyContextItem } from '../src/types';

const baseValues: PodContentValues = {
  pod_title: 'Sample Pod',
  pod_description: 'Sample description',
  pod_images_and_videos: [{ url: 'https://example.com/a.jpg', type: 'IMAGE' }],
};

const allFields: PodField[] = ['pod_title', 'pod_description', 'pod_images_and_videos'];

describe('PodContentFormDialog', () => {
  it('renders the default title and populates fields from defaultValues', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Edit pod')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Sample Pod');
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Sample description');
  });

  it('renders a custom title when provided', () => {
    render(
      <PodContentFormDialog
        open
        title="Custom title"
        defaultValues={baseValues}
        editableFields={allFields}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(
      <PodContentFormDialog open={false} defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByText('Edit pod')).not.toBeInTheDocument();
  });

  it('enables only the fields listed in editableFields and disables the rest', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={['pod_title']} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByLabelText(/^Name/)).toBeEnabled();
    expect(screen.getByLabelText(/^Description/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /add image/i })).not.toBeInTheDocument();
  });

  it('shows the read-only context block when items are supplied', () => {
    const ctx: ReadOnlyContextItem[] = [
      { label: 'Date', value: 'Jul 20' },
      { label: 'Venue', value: 'HQ' },
    ];
    render(
      <PodContentFormDialog
        open
        defaultValues={baseValues}
        editableFields={allFields}
        readOnlyContext={ctx}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Pod details (read-only)')).toBeInTheDocument();
    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByText('Jul 20')).toBeInTheDocument();
    expect(screen.getByText('Venue:')).toBeInTheDocument();
    expect(screen.getByText('HQ')).toBeInTheDocument();
  });

  it('omits the read-only context block when no items are supplied', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByText('Pod details (read-only)')).not.toBeInTheDocument();
  });

  it('renders the image gallery and lets an editable form remove an image', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByAltText('Pod media')).toBeInTheDocument();
    // MUI Dialog portals into document.body, outside the RTL render container.
    const deleteIcon = document.querySelector('svg[data-testid="DeleteIcon"]');
    expect(deleteIcon).toBeInTheDocument();
    const deleteButton = deleteIcon?.closest('button');
    expect(deleteButton).not.toBeNull();
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    expect(screen.queryByAltText('Pod media')).not.toBeInTheDocument();
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
  });

  it('shows "No images yet." when there are no images', () => {
    render(
      <PodContentFormDialog
        open
        defaultValues={{ ...baseValues, pod_images_and_videos: [] }}
        editableFields={allFields}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
  });

  it('hides the per-image delete icon when images are not editable', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={[]} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByAltText('Pod media')).toBeInTheDocument();
    expect(document.querySelector('svg[data-testid="DeleteIcon"]')).not.toBeInTheDocument();
  });

  it('hides the Add image button when onPickImage is not provided, even if images are editable', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /add image/i })).not.toBeInTheDocument();
  });

  it('hides the Add image button when images are not editable, even if onPickImage is provided', () => {
    render(
      <PodContentFormDialog
        open
        defaultValues={baseValues}
        editableFields={['pod_title']}
        onPickImage={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /add image/i })).not.toBeInTheDocument();
  });

  it('calls onPickImage and appends the returned image to the gallery', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue('https://example.com/new.jpg');
    render(
      <PodContentFormDialog
        open
        defaultValues={{ ...baseValues, pod_images_and_videos: [] }}
        editableFields={allFields}
        onPickImage={onPickImage}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add image/i }));
    expect(onPickImage).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByAltText('Pod media')).toHaveLength(1);
  });

  it('does not append an image when onPickImage resolves to null', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue(null);
    render(
      <PodContentFormDialog
        open
        defaultValues={{ ...baseValues, pod_images_and_videos: [] }}
        editableFields={allFields}
        onPickImage={onPickImage}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /add image/i }));
    await waitFor(() => expect(onPickImage).toHaveBeenCalledTimes(1));
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
  });

  it('shows the error alert when an error message is provided', () => {
    render(
      <PodContentFormDialog
        open
        defaultValues={baseValues}
        editableFields={allFields}
        error="Something went wrong"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('omits the error alert when no error is provided', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows "Saving…" and disables the submit button while busy', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} busy onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('shows "Save" and keeps the submit button enabled when not busy', () => {
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={onClose} onSubmit={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits mapped values when the form passes validation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PodContentFormDialog open defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    const nameInput = screen.getByLabelText(/^Name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      pod_title: 'Updated Name',
      pod_description: 'Sample description',
    });
  });

  it('shows validation errors and does not submit when the form is invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PodContentFormDialog
        open
        defaultValues={{ ...baseValues, pod_title: 'A', pod_description: '' }}
        editableFields={allFields}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('resets the form to the latest defaultValues each time the dialog opens', () => {
    const { rerender } = render(
      <PodContentFormDialog open={false} defaultValues={baseValues} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const updated = { ...baseValues, pod_title: 'Reopened Pod' };
    rerender(
      <PodContentFormDialog open defaultValues={updated} editableFields={allFields} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Reopened Pod');
  });
});

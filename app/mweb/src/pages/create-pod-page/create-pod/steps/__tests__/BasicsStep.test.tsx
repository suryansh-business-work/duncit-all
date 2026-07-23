import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Both child fields depend on the media-picker workspace package.
// MediaUrlsField uses the default export (a dialog); PodReelAccordion uses the
// named upload/compress helpers. Stub all of them.
vi.mock('@duncit/media-picker', () => ({
  __esModule: true,
  default: ({ open, onClose, onPicked }: any) =>
    open ? (
      <div data-testid="picker">
        <button type="button" onClick={() => onPicked('https://ik.example/cover.jpg')}>
          pick-image
        </button>
        <button type="button" onClick={onClose}>
          close-picker
        </button>
      </div>
    ) : null,
  useImagekitDirectUpload: () => ({ upload: vi.fn(), uploading: false }),
  compressUploadedVideo: vi.fn(),
}));

import BasicsStep from '../BasicsStep';
import { blankCreatePodForm } from '../../create-pod.types';

let formRef: any;

function Harness({ withErrors = false }: { withErrors?: boolean }) {
  const form = useForm({ defaultValues: { ...blankCreatePodForm } });
  formRef = form;
  useEffect(() => {
    if (withErrors) {
      form.setError('pod_title', { message: 'Title is required' });
      form.setError('pod_description', { message: 'Description is required' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <BasicsStep form={form as any} />;
}

function renderStep(withErrors = false) {
  return render(
    <MockedProvider mocks={[]}>
      <Harness withErrors={withErrors} />
    </MockedProvider>,
  );
}

describe('BasicsStep', () => {
  it('renders the title and description fields with default helper text', () => {
    renderStep();
    expect(screen.getByPlaceholderText('e.g. Downtown Runners Club')).toBeInTheDocument();
    expect(screen.getByText(/What is this pod about\? \(3–120 characters\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tell people what to expect/)).toBeInTheDocument();
    // Cover media + offers + hashtags + optional settings + reel all mount.
    expect(screen.getByText('Cover image')).toBeInTheDocument();
    expect(screen.getByText('What this pod offers')).toBeInTheDocument();
    expect(screen.getByLabelText('Hashtags')).toBeInTheDocument();
    expect(screen.getByText('OPTIONAL SETTINGS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pod Reel/ })).toBeInTheDocument();
  });

  it('updates form values as the user types the title and description', () => {
    renderStep();
    const title = screen.getByPlaceholderText('e.g. Downtown Runners Club');
    fireEvent.change(title, { target: { value: 'Morning Yoga' } });
    expect(formRef.getValues('pod_title')).toBe('Morning Yoga');

    const desc = screen.getByPlaceholderText(/Describe the purpose, vibe/);
    fireEvent.change(desc, { target: { value: 'A calm session' } });
    expect(formRef.getValues('pod_description')).toBe('A calm session');
  });

  it('shows validation error helper text when the form has field errors', () => {
    renderStep(true);
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('adds a "what this pod offers" chip through ChipArrayField', () => {
    renderStep();
    const offersInput = screen.getByPlaceholderText('e.g. Coaching, Snacks, Equipment');
    fireEvent.change(offersInput, { target: { value: 'Coaching' } });
    fireEvent.keyDown(offersInput, { key: 'Enter' });
    expect(formRef.getValues('what_this_pod_offers')).toEqual(['Coaching']);
    expect(screen.getByText('Coaching')).toBeInTheDocument();
  });

  it('adds a hashtag chip and serializes it back into the form', () => {
    renderStep();
    const tagInput = screen.getByPlaceholderText('Type a tag and press Enter');
    fireEvent.change(tagInput, { target: { value: 'run' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    expect(formRef.getValues('pod_hashtag_text')).toBe('#run');
    expect(screen.getByText('#run')).toBeInTheDocument();
  });

  it('picks a cover image via the media dialog and stores it in media_text', async () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Upload an image' }));
    fireEvent.click(screen.getByText('pick-image'));
    await waitFor(() =>
      expect(formRef.getValues('media_text')).toBe('https://ik.example/cover.jpg'),
    );
  });
});

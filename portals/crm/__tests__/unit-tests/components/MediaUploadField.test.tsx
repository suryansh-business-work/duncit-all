import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import MediaUploadField from '@/forms/fields/MediaUploadField';

function Harness({ initial, kind }: Readonly<{ initial: string; kind: 'image' | 'video' }>) {
  const methods = useForm({ defaultValues: { photos: initial } });
  return (
    <FormProvider {...methods}>
      <form>
        <MediaUploadField name="photos" label="Venue Photos" kind={kind} />
      </form>
    </FormProvider>
  );
}

const renderField = (initial: string, kind: 'image' | 'video' = 'image') =>
  render(
    <MockedProvider mocks={[]} addTypename={false}>
      <Harness initial={initial} kind={kind} />
    </MockedProvider>
  );

describe('MediaUploadField', () => {
  it('renders an upload button and NO free-text URL input (no paste)', () => {
    renderField('');
    expect(screen.getByRole('button', { name: /Add images/i })).toBeTruthy();
    // Point 6: there must be no URL text field to paste into.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders a thumbnail per saved URL and removes one on click', () => {
    const { container } = renderField('https://ik.test/a.jpg\nhttps://ik.test/b.jpg');
    expect(container.querySelectorAll('img')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /remove media/i })[0]);
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('uses a hidden video file input for the video kind', () => {
    const { container } = renderField('https://ik.test/a.mp4', 'video');
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('video/*');
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_IMAGE_MAX_MB, MB, UPLOAD_IMAGE } from '@duncit/media-picker';
import ImageUploadField from '@/forms/fields/ImageUploadField';
import { renderWithApollo } from '../helpers/renderWithApollo';

const file = (name: string, sizeBytes: number) => {
  const f = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
};

/** A form whose photo URL is printed so a test can read what the field stored. */
function Harness({ initial, label }: Readonly<{ initial?: string; label?: string }>) {
  const methods = useForm<{ profile_photo_url?: string }>({
    defaultValues: initial === undefined ? {} : { profile_photo_url: initial },
  });
  const url = methods.watch('profile_photo_url');
  return (
    <FormProvider {...methods}>
      <ImageUploadField name="profile_photo_url" label={label} folder="crm/hosts" shape="circle" />
      <output data-testid="url">{url ?? 'unset'}</output>
    </FormProvider>
  );
}

const pick = (f: File) =>
  fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement, { target: { files: [f] } });

describe('ImageUploadField', () => {
  it('uses the default label and offers an upload when the form holds no image', () => {
    renderWithApollo(<Harness />);

    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByTestId('upload-profile_photo_url')).toHaveTextContent('Upload');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('refuses a file over the image cap with the CRM size message, without uploading', async () => {
    const variableMatcher = vi.fn<(vars: Record<string, unknown>) => boolean>(() => true);
    const uploadMock: MockedResponse = {
      request: { query: UPLOAD_IMAGE, variables: variableMatcher },
      result: { data: { uploadImageToImagekit: { url: 'https://cdn.duncit.com/never.png', fileId: null, thumbnailUrl: null } } },
    };
    renderWithApollo(<Harness />, [uploadMock]);

    pick(file('huge.png', (DEFAULT_IMAGE_MAX_MB + 1) * MB));

    expect(await screen.findByRole('alert')).toHaveTextContent(`Max ${DEFAULT_IMAGE_MAX_MB} MB. Compress and try again.`);
    expect(variableMatcher).not.toHaveBeenCalled();
    expect(screen.getByTestId('url')).toHaveTextContent('unset');
  });

  it('uploads a picked file to its folder and stores the returned URL', async () => {
    const variableMatcher = vi.fn<(vars: Record<string, unknown>) => boolean>(() => true);
    const uploadMock: MockedResponse = {
      request: { query: UPLOAD_IMAGE, variables: variableMatcher },
      result: { data: { uploadImageToImagekit: { url: 'https://cdn.duncit.com/crm/hosts/new.png', fileId: 'f1', thumbnailUrl: null } } },
    };
    renderWithApollo(<Harness initial="https://cdn.duncit.com/crm/hosts/old.png" label="Profile photo" />, [uploadMock]);

    expect(screen.getByText('Profile photo')).toBeInTheDocument();
    expect(screen.getByTestId('upload-profile_photo_url')).toHaveTextContent('Replace');

    pick(file('new.png', 1024));

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('https://cdn.duncit.com/crm/hosts/new.png'));
    expect(variableMatcher).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'new.png', mimeType: 'image/png', folder: 'crm/hosts' }),
    );
  });
});

import type { MockedResponse } from '@apollo/client/testing';
import type { UploadedImage } from '@duncit/gql-types';
import { UPLOAD_IMAGE } from '@duncit/media-picker';

/**
 * ImageKit upload mocks for the shared `AttachmentUploadField` (support config).
 * `uploadImageToImagekit` returns the schema `UploadedImage`; the field only
 * consumes `url`, so `fileId`/`thumbnailUrl` are modelled as the nullable
 * extras the resolver may omit. `__typename` keeps the default cache happy.
 */
export type UploadedImageMock = Pick<UploadedImage, 'url'> & {
  __typename?: 'UploadedImage';
  fileId: string | null;
  thumbnailUrl: string | null;
};

/** A successful upload. `url === null` models the "no URL returned" failure path. */
export const uploadMock = (url: string | null): MockedResponse => ({
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  result: {
    data: {
      uploadImageToImagekit:
        url === null ? null : { __typename: 'UploadedImage', url, fileId: null, thumbnailUrl: null },
    },
  },
});

/** A network failure during upload. */
export const uploadErrorMock = (message = 'network down'): MockedResponse => ({
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  error: new Error(message),
});

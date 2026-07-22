import { describe, expect, it } from 'vitest';
import type { DocumentNode, OperationDefinitionNode } from 'graphql';
import { print } from 'graphql';

import {
  UPLOAD_STATUS_MEDIA,
  CREATE_STATUS_POST,
  ADD_POD_STATUS,
} from '../queries';

const opDef = (doc: DocumentNode): OperationDefinitionNode =>
  doc.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === 'OperationDefinition',
  )!;

describe('status-upload queries', () => {
  it('exports parsed mutation documents', () => {
    for (const doc of [UPLOAD_STATUS_MEDIA, CREATE_STATUS_POST, ADD_POD_STATUS]) {
      expect(doc.kind).toBe('Document');
      expect(opDef(doc).operation).toBe('mutation');
    }
  });

  it('UPLOAD_STATUS_MEDIA targets uploadImageToImagekit with MOBILE_MWEB surface', () => {
    const op = opDef(UPLOAD_STATUS_MEDIA);
    expect(op.name?.value).toBe('UploadStatusMedia');
    const printed = print(UPLOAD_STATUS_MEDIA);
    expect(printed).toContain('uploadImageToImagekit');
    expect(printed).toContain('surface: "MOBILE_MWEB"');
    expect(printed).toContain('crop_preset: $cropPreset');
    expect(printed).toContain('fileId');
    const varNames = (op.variableDefinitions ?? []).map(
      (v) => v.variable.name.value,
    );
    expect(varNames).toEqual([
      'fileBase64',
      'fileName',
      'mimeType',
      'folder',
      'crop',
      'cropPreset',
    ]);
  });

  it('CREATE_STATUS_POST calls createPost and selects post fields', () => {
    const op = opDef(CREATE_STATUS_POST);
    expect(op.name?.value).toBe('CreateStatusPost');
    const printed = print(CREATE_STATUS_POST);
    expect(printed).toContain('createPost(input: $input)');
    expect(printed).toContain('image_url');
    expect(printed).toContain('created_at');
  });

  it('ADD_POD_STATUS calls addPodStatus with pod and media args', () => {
    const op = opDef(ADD_POD_STATUS);
    expect(op.name?.value).toBe('AddPodStatus');
    const printed = print(ADD_POD_STATUS);
    expect(printed).toContain('addPodStatus(pod_doc_id: $podId, media: $media)');
    expect(printed).toContain('pod_images_and_videos');
    const varNames = (op.variableDefinitions ?? []).map(
      (v) => v.variable.name.value,
    );
    expect(varNames).toEqual(['podId', 'media']);
  });
});

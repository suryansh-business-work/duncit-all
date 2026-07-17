import { describe, expect, it } from 'vitest';
import MediaPickerDialog from '../../src/components/MediaPickerDialog';

describe('MediaPickerDialog re-export', () => {
  it('re-exports the shared media picker component', () => {
    expect(MediaPickerDialog).toBeDefined();
    expect(['function', 'object']).toContain(typeof MediaPickerDialog);
  });
});

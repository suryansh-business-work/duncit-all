import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvEntryForm from './env-entry.form';
import { envEntrySchema, toConfigPairs } from './env-entry.types';
import type { EnvCategoryDef, EnvEntry } from '../queries';

const imagekitDef: EnvCategoryDef = {
  category: 'IMAGEKIT',
  label: 'ImageKit',
  fields: [
    { name: 'public_key', label: 'Public Key', secret: false, number: false, bool: false },
    { name: 'private_key', label: 'Private Key', secret: true, number: false, bool: false },
    { name: 'url_endpoint', label: 'URL Endpoint', secret: false, number: false, bool: false },
  ],
};

const entry: EnvEntry = {
  id: '1', name: 'IK', category: 'IMAGEKIT', description: '', is_default: true, is_active: true,
  assigned_portals: [], config: [{ key: 'public_key', value: 'pk' }, { key: 'url_endpoint', value: 'https://ik' }],
  secrets: [{ key: 'has_private_key', present: true }], last_used_at: null, created_at: null, updated_at: null,
};

describe('EnvEntryForm', () => {
  it('requires the primary secret on create but not on edit', async () => {
    await expect(envEntrySchema(imagekitDef, false).validate({ name: 'X', config: {} })).rejects.toThrow(/required/i);
    await expect(envEntrySchema(imagekitDef, false).validate({ name: 'X', config: { private_key: 'k' } })).resolves.toBeTruthy();
    await expect(envEntrySchema(imagekitDef, true).validate({ name: 'X', config: {} })).resolves.toBeTruthy();
  });

  it('drops blank secrets from the config pairs', () => {
    const pairs = toConfigPairs(imagekitDef, { name: 'X', description: '', is_default: false, is_active: true, config: { public_key: 'p', private_key: '' } });
    expect(pairs.find((p) => p.key === 'private_key')).toBeUndefined();
    expect(pairs.find((p) => p.key === 'public_key')?.value).toBe('p');
  });

  it('renders the create dialog with the category label', () => {
    render(<EnvEntryForm open def={imagekitDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('New ImageKit entry')).toBeDefined();
  });

  it('fires the test handler when editing', () => {
    const onTest = vi.fn();
    render(<EnvEntryForm open def={imagekitDef} initial={entry} onSubmit={vi.fn()} onClose={vi.fn()} onTest={onTest} />);
    fireEvent.click(screen.getByRole('button', { name: /Test connection/i }));
    expect(onTest).toHaveBeenCalled();
  });
});

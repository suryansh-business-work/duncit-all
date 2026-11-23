import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import AccessSection from '../../src/pages/settings/access';
import EmbeddingsSection from '../../src/pages/settings/embeddings';
import GeneralSection from '../../src/pages/settings/general';
import MediaSection from '../../src/pages/settings/media';
import ModelsSection from '../../src/pages/settings/models';
import OpenAiSection from '../../src/pages/settings/openai';
import SecuritySection from '../../src/pages/settings/security';
import SyncSection from '../../src/pages/settings/sync';
import { INTEL_ENTRY_OPTIONS } from '../../src/graphql/admin';
import type { IntelSettingsValue } from '../../src/pages/settings/settings.types';
import { bootstrap, renderWithProviders } from '../testkit';

const state = vi.hoisted(() => ({ save: vi.fn(), value: null as unknown, saveError: null as string | null, loading: false, error: null as Error | null }));
vi.mock('../../src/pages/settings/useIntelSettings', () => ({
  useIntelSettings: () => ({ value: state.value, loading: state.loading, error: state.error, refetch: vi.fn(() => Promise.resolve()), save: state.save, saving: false, saveError: state.saveError }),
}));
const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));

const SETTINGS: IntelSettingsValue = {
  general: { app_title: 'Duncit Intel', description: 'BI', default_environment: 'STAGING', auto_sync: true },
  models: [
    { id: 'gpt-4o', label: 'GPT-4o', enabled: true, is_default: true },
    { id: 'gpt-4o-mini', label: 'mini', enabled: true, is_default: false },
  ],
  chat: { temperature: 0.2, max_output_tokens: 1800, max_tool_rounds: 5, history_turns: 12 },
  openai: { env_entry_id: '' },
  embeddings: { model: 'text-embedding-3-small', dimensions: 1536, chunk_chars: 1200, chunk_overlap: 200, top_k: 8 },
  media: { max_file_mb: 100, allowed_types: ['application/pdf'], auto_index: true, ocr_images: true, extract_pdf: true, default_visibility: 'PRIVATE', vision_model: 'gpt-4o-mini' },
  sync: { paused: false, interval_minutes: 60, max_items_per_run: 2000 },
  access: {
    employee: { environments: ['STAGING'], sources: ['MEDIA'], can_request_writes: false, messages_per_day: 300 },
    admin: { environments: ['STAGING', 'PRODUCTION'], sources: ['MEDIA', 'GITHUB'], can_request_writes: true, messages_per_day: 1000 },
  },
  security: { four_eyes_production: true, approval_expiry_hours: 24, messages_per_minute: 12, mcp_allowed_hosts: ['mcp.duncit.com'], block_injection: true },
};

beforeEach(() => {
  state.save = vi.fn().mockResolvedValue(true);
  state.value = structuredClone(SETTINGS);
  state.saveError = null;
  state.loading = false;
  state.error = null;
  boot.value = bootstrap({}, { can_super: true, level: 'SUPER_ADMIN' });
});

const save = () => fireEvent.click(screen.getAllByRole('button', { name: 'intel.common.save' })[0] as HTMLElement);

describe('Settings sections', () => {
  it('General saves the edited title', async () => {
    renderWithProviders(<GeneralSection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.general.appTitle/), { target: { value: 'Intel HQ' } });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('general', expect.objectContaining({ app_title: 'Intel HQ' })));
  });

  it('General refuses an empty title without saving', async () => {
    renderWithProviders(<GeneralSection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.general.appTitle/), { target: { value: '' } });
    save();
    expect(await screen.findByText('intel.settings.general.titleRequired')).toBeInTheDocument();
    expect(state.save).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal and a load failure', () => {
    state.saveError = 'These settings were changed by someone else.';
    const first = renderWithProviders(<GeneralSection />);
    expect(screen.getByText(/changed by someone else/)).toBeInTheDocument();
    first.unmount();
    state.value = null;
    state.error = new Error('down');
    renderWithProviders(<GeneralSection />);
    expect(screen.getByText('intel.settings.loadFailed')).toBeInTheDocument();
  });

  it('Embeddings saves numbers, not text', async () => {
    renderWithProviders(<EmbeddingsSection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.embeddings.topK/), { target: { value: '5' } });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('embeddings', expect.objectContaining({ top_k: 5, dimensions: 1536 })));
  });

  it('Sync saves the interval', async () => {
    renderWithProviders(<SyncSection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.sync.interval/), { target: { value: '30' } });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('sync', { paused: false, interval_minutes: 30, max_items_per_run: 2000 }));
  });

  it('Security saves the host list as a clean array for a Super Admin', async () => {
    renderWithProviders(<SecuritySection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.security.hosts/), { target: { value: 'mcp.duncit.com\nTools.Example.com' } });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('security', expect.objectContaining({ mcp_allowed_hosts: ['mcp.duncit.com', 'tools.example.com'] })));
  });

  it('Security and Access are read-only for an Admin', () => {
    boot.value = bootstrap();
    renderWithProviders(
      <>
        <SecuritySection />
        <AccessSection />
      </>
    );
    expect(screen.getAllByText('intel.settings.superOnly')).toHaveLength(2);
    screen.getAllByRole('button', { name: 'intel.common.save' }).forEach((b) => expect(b).toBeDisabled());
  });

  it('Access saves both policies', async () => {
    renderWithProviders(<AccessSection />);
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('access', SETTINGS.access));
  });

  it('Media saves the upload limit', async () => {
    renderWithProviders(<MediaSection />);
    fireEvent.change(screen.getByLabelText(/intel.settings.media.maxMb/), { target: { value: '50' } });
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('media', expect.objectContaining({ max_file_mb: 50 })));
  });

  it('AI Models moves the default with the radio and saves the list; answer settings save separately', async () => {
    renderWithProviders(<ModelsSection />);
    fireEvent.click(screen.getByRole('radio', { name: 'intel.settings.models.defaultFor:mini' }));
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('models', [expect.objectContaining({ id: 'gpt-4o', is_default: false }), expect.objectContaining({ id: 'gpt-4o-mini', is_default: true })]));
    fireEvent.click(screen.getAllByRole('button', { name: 'intel.common.save' })[1] as HTMLElement);
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('chat', SETTINGS.chat));
  });

  it('AI Models adds and removes rows', () => {
    renderWithProviders(<ModelsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.models.add' }));
    expect(screen.getAllByRole('button', { name: 'intel.settings.models.remove' })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'intel.settings.models.remove' })[2] as HTMLElement);
    expect(screen.getAllByRole('button', { name: 'intel.settings.models.remove' })).toHaveLength(2);
  });

  it('OpenAI picks an entry by name from the Tech portal', async () => {
    const entries = { request: { query: INTEL_ENTRY_OPTIONS, variables: { kind: 'OPENAI' } }, result: { data: { intelEntryOptions: [{ __typename: 'IntelEntryOption', id: 'e1', name: 'Intel key', description: '', is_default: false, last_test_ok: true }] } } };
    renderWithProviders(<OpenAiSection />, { mocks: [entries] });
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /intel.settings.openai.entry/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Intel key' }));
    save();
    await waitFor(() => expect(state.save).toHaveBeenCalledWith('openai', { env_entry_id: 'e1' }));
  });
});

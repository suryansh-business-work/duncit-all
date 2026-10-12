import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import HostEditorPage, { makeHostFormSchema } from '../../../src/hosts/editor';

const state = vi.hoisted(() => ({
  editor: null as Record<string, unknown> | null,
  shell: null as Record<string, unknown> | null,
  sections: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('../../../src/hosts/editor/useHostEditor', () => ({
  useHostEditor: () => state.editor,
}));
vi.mock('../../../src/shared/useMediaPicker', () => ({
  default: () => ({ pickImage: 'pick-fn', open: false }),
}));
vi.mock('../../../src/shared/recordPaths', () => ({
  useRecordParentPath: () => '/parent-path',
}));
vi.mock('../../../src/shared/EditorPageShell', () => ({
  default: (props: Record<string, unknown> & { children: React.ReactNode }) => {
    state.shell = props;
    return <div data-testid="shell">{props.children}</div>;
  },
}));
function stub(name: string) {
  return {
  default: (props: Record<string, unknown>) => {
    state.sections[name] = props;
    return <div data-testid={name} />;
  },
  };
}
vi.mock('../../../src/hosts/editor/sections/IdentitySection', () => stub('identity'));
vi.mock('../../../src/hosts/editor/sections/VerificationSection', () => stub('verification'));
vi.mock('../../../src/hosts/editor/sections/CategoriesSection', () => stub('categories'));
vi.mock('../../../src/hosts/editor/sections/StatusSection', () => stub('status'));

const editorState = (over: Record<string, unknown> = {}) => ({
  form: { control: 'ctl', setValue: 'setter', handleSubmit: (fn: unknown) => `submit(${String(fn === submit)})` },
  host: null,
  isEdit: false,
  canGovern: true,
  busy: false,
  saveError: null,
  loading: false,
  error: undefined,
  submit,
  ...over,
});
const submit = () => undefined;

const renderPage = (path = '/hosts/new') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hosts/new" element={<HostEditorPage />} />
        <Route path="/hosts/:hostId/edit" element={<HostEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('HostEditorPage', () => {
  beforeEach(() => {
    state.shell = null;
    state.sections = {};
  });

  it('opens the create frame with all four sections wired to the form', () => {
    state.editor = editorState();
    renderPage();

    expect(state.shell).toMatchObject({
      eyebrow: 'Hosts · Add',
      title: 'New host',
      backTo: '/parent-path',
      busy: false,
      error: null,
      onSubmit: 'submit(true)',
    });
    for (const id of ['identity', 'verification', 'categories', 'status']) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(state.sections.identity).toMatchObject({ control: 'ctl', setValue: 'setter', isEdit: false });
    expect(state.sections.verification).toMatchObject({ control: 'ctl', onPick: 'pick-fn' });
    expect(state.sections.status).toMatchObject({ control: 'ctl', canGovern: true });
  });

  it('titles an existing host by name and passes governance through', () => {
    state.editor = editorState({
      isEdit: true,
      host: { full_name: 'Ananya Iyer' },
      canGovern: false,
      busy: true,
      saveError: 'Server said no',
    });
    renderPage('/hosts/h-1/edit');

    expect(state.shell).toMatchObject({
      eyebrow: 'Hosts · Edit',
      title: 'Ananya Iyer',
      busy: true,
      error: 'Server said no',
    });
    expect(state.sections.status).toMatchObject({ canGovern: false });
    expect(state.sections.identity).toMatchObject({ isEdit: true });
  });

  it('falls back to the generic edit title for a host with no name', () => {
    state.editor = editorState({ isEdit: true, host: { full_name: '' } });
    renderPage('/hosts/h-1/edit');
    expect(state.shell).toMatchObject({ title: 'Edit host' });
  });

  it('says the host was not found instead of drawing an empty form', () => {
    state.editor = editorState({ isEdit: true, host: null });
    renderPage('/hosts/gone/edit');
    expect(screen.getByText('Host not found.')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('shows the load error and no form while the host fails to load', () => {
    state.editor = editorState({ isEdit: true, error: new Error('boom: network') });
    renderPage('/hosts/h-1/edit');
    expect(screen.getByText('boom: network')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('re-exports the form schema factory from the editor barrel', () => {
    expect(typeof makeHostFormSchema).toBe('function');
  });
});

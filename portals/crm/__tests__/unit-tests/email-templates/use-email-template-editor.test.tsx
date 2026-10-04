import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { DELETE, RENDER, UPDATE } from '@/api/emailTemplates.gql';
import { useEmailTemplateEditor } from '@/pages/email-templates/useEmailTemplateEditor';
import { TEMPLATE_ID, renderMock, templateMock, venueTemplate } from './editorHarness';

const wrapperFor = (mocks: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <MemoryRouter>{children}</MemoryRouter>
      </MockedProvider>
    );
  };

describe('useEmailTemplateEditor before a template is loaded', () => {
  it('treats every editing action as a no-op and sends nothing to the server', async () => {
    const update = vi.fn(() => ({ data: { updateEmailTemplate: { template_id: TEMPLATE_ID } } }));
    const remove = vi.fn(() => ({ data: { deleteEmailTemplate: true } }));
    const render = vi.fn(() => ({ data: { renderEmailTemplate: { html: '', errors: [], detected_variables: [] } } }));
    const { result } = renderHook(() => useEmailTemplateEditor(TEMPLATE_ID), {
      wrapper: wrapperFor([
        templateMock(null),
        { request: { query: UPDATE, variables: () => true }, result: update },
        { request: { query: DELETE, variables: () => true }, result: remove },
        { request: { query: RENDER, variables: () => true }, result: render },
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.template).toBeNull();
    expect(result.current.draft).toBeNull();

    await act(async () => {
      await result.current.save();
      await result.current.remove();
    });
    act(() => {
      result.current.importDetected();
      result.current.addVariable('venue_name', 'Venue display name');
      result.current.removeVariable('venue_name');
      result.current.setImages([{ url: 'https://cdn.duncit.com/hero.png', name: 'Hero' }]);
      result.current.setAttachments([{ url: 'https://cdn.duncit.com/rate-card.pdf', name: 'Rate card' }]);
    });

    expect(result.current.draft).toBeNull();
    expect(result.current.dirty).toBe(false);
    expect(result.current.busy).toBe(false);
    expect(result.current.snack).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('has nothing to render, so verifying finds no MJML issues without calling the renderer', async () => {
    const render = vi.fn(() => ({ data: { renderEmailTemplate: { html: '', errors: ['x'], detected_variables: [] } } }));
    const { result } = renderHook(() => useEmailTemplateEditor(TEMPLATE_ID), {
      wrapper: wrapperFor([templateMock(null), { request: { query: RENDER, variables: () => true }, result: render }]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.validateMjml();
    });

    expect(result.current.snack).toEqual({ kind: 'success', msg: 'MJML looks good' });
    expect(result.current.previewErrors).toEqual([]);
    expect(render).not.toHaveBeenCalled();
  });
});

describe('useEmailTemplateEditor with a loaded template', () => {
  it('does not add a variable that is already declared', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor(TEMPLATE_ID), {
      wrapper: wrapperFor([templateMock(venueTemplate), renderMock({})]),
    });
    await waitFor(() => expect(result.current.draft?.template_id).toBe(TEMPLATE_ID));

    act(() => result.current.addVariable('venue_name', 'Another description'));

    expect(result.current.draft?.variables).toEqual([
      { key: 'venue_name', description: 'Venue display name', sample: 'Grand Hall' },
    ]);
    expect(result.current.dirty).toBe(false);

    act(() => result.current.addVariable('city'));

    expect(result.current.draft?.variables.map((v) => [v.key, v.description])).toEqual([
      ['venue_name', 'Venue display name'],
      ['city', null],
    ]);
    expect(result.current.dirty).toBe(true);
  });

  it('swaps the image list without flagging unsaved edits, since images persist on their own', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor(TEMPLATE_ID), {
      wrapper: wrapperFor([templateMock(venueTemplate), renderMock({})]),
    });
    await waitFor(() => expect(result.current.draft?.template_id).toBe(TEMPLATE_ID));

    act(() => {
      result.current.setImages([{ url: 'https://cdn.duncit.com/footer.png', name: 'Footer' }]);
    });

    expect(result.current.draft?.images).toEqual([{ url: 'https://cdn.duncit.com/footer.png', name: 'Footer' }]);
    expect(result.current.dirty).toBe(false);
  });
});

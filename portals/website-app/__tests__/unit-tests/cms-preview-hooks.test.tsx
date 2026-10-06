import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useSiteTokens } from '../../src/pages/cms/lib/useSiteTokens';
import { useCopyPreviewLink } from '../../src/pages/cms/lib/useCopyPreviewLink';
import { CMS_PREVIEW_LINK } from '../../src/pages/cms/queries/pages';
import { CMS_COMPONENT_PREVIEW_LINK } from '../../src/pages/cms/queries/fragments';
import { SITE_DESIGN_TOKENS, siteDesignMock } from '../mocks/cms.mock';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const wrapperWith =
  (mocks: MockedResponse[]) =>
  ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      {children}
    </MockedProvider>
  );

const link = (url: string) => ({ __typename: 'CmsPreviewLink', url, expires_at: '2026-10-06T12:00:00.000Z' });
const pageLink = (result: MockedResponse['result']): MockedResponse => ({ request: { query: CMS_PREVIEW_LINK, variables: { pageId: 'page-1' } }, result });
const componentLink = (result: MockedResponse['result']): MockedResponse => ({
  request: { query: CMS_COMPONENT_PREVIEW_LINK, variables: { id: 'frag-1' } },
  result,
});

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('useSiteTokens', () => {
  it('lists the site tokens and its font variables', async () => {
    const { result } = renderHook(() => useSiteTokens('site-1'), { wrapper: wrapperWith([siteDesignMock()]) });
    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual(SITE_DESIGN_TOKENS));
  });

  it('lists nothing without a site, and nothing for a site the server cannot find', async () => {
    const none = renderHook(() => useSiteTokens(''), { wrapper: wrapperWith([]) });
    const missing = renderHook(() => useSiteTokens('site-1'), { wrapper: wrapperWith([siteDesignMock('site-1', 'none')]) });
    await waitFor(() => expect(missing.result.current).toEqual([]));
    expect(none.result.current).toEqual([]);
  });
});

describe('useCopyPreviewLink', () => {
  it("copies a page's signed preview link and says it is copied", async () => {
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith([pageLink({ data: { cmsPreviewLink: link('https://duncit.com/about?preview=abc') } })]) });
    result.current.page('page-1');
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Preview link copied. It works for 2 hours.'));
    expect(writeText).toHaveBeenCalledWith('https://duncit.com/about?preview=abc');
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("copies a component's own preview link", async () => {
    const mocks = [componentLink({ data: { cmsComponentPreviewLink: link('https://duncit.com/_component/frag-1?preview=x') } })];
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith(mocks) });
    result.current.component('frag-1');
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://duncit.com/_component/frag-1?preview=x'));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('reports a failed copy when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('Document is not focused'));
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith([pageLink({ data: { cmsPreviewLink: link('https://duncit.com/') } })]) });
    result.current.page('page-1');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The preview link could not be copied.'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('reports a failed copy when the server signs no link', async () => {
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith([pageLink({ data: { cmsPreviewLink: link('') } })]) });
    result.current.page('page-1');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The preview link could not be copied.'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shows the server's own reason when it refuses for something the editor can fix", async () => {
    const refusal = new GraphQLError('This component has no draft yet. Save it first.', { extensions: { code: 'BAD_USER_INPUT' } });
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith([componentLink({ errors: [refusal] })]) });
    result.current.component('frag-1');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('This component has no draft yet. Save it first.'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('hides internal server errors behind the console message', async () => {
    const crash = new GraphQLError('Cannot read properties of undefined', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
    const { result } = renderHook(() => useCopyPreviewLink(), { wrapper: wrapperWith([pageLink({ errors: [crash] })]) });
    result.current.page('page-1');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The preview link could not be copied.'));
  });
});

import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { SERVER_LANGUAGE, useServerProblems, type CodeLanguage } from '../../src/pages/cms/components/code-field/useServerProblems';
import { CMS_VALIDATE_CODE } from '../../src/pages/cms/queries/code';

const unclosed = { __typename: 'CmsCodeProblem' as const, line: 1, column: 3, message: 'expected "}"', severity: 'ERROR' as const };

const validates = (language: string, source: string, problems: (typeof unclosed)[]): MockedResponse => ({
  request: { query: CMS_VALIDATE_CODE, variables: { language, source } },
  result: { data: { cmsValidateCode: problems } },
});

const renderProblems = (language: CodeLanguage, source: string, mocks: MockedResponse[] = []) =>
  renderHook((props: { language: CodeLanguage; source: string }) => useServerProblems(props.language, props.source), {
    initialProps: { language, source },
    wrapper: ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
        {children}
      </MockedProvider>
    ),
  });

/** Lets the debounce timer and Apollo's mocked round-trip run. */
const elapse = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useServerProblems', () => {
  it('names each editor language the way the API does, and skips HTML', () => {
    expect(SERVER_LANGUAGE).toEqual({ scss: 'SCSS', javascript: 'JS', astro: 'ASTRO', html: null });
  });

  it('never asks the server about HTML', async () => {
    const { result } = renderProblems('html', '<div>');
    expect(result.current).toEqual({ problems: [], checking: false });
    await elapse(1000);
    expect(result.current).toEqual({ problems: [], checking: false });
  });

  it('does not check blank code', async () => {
    const { result } = renderProblems('scss', '   \n');
    await elapse(1000);
    expect(result.current).toEqual({ problems: [], checking: false });
  });

  it('checks the code it opens with, reporting checking until the answer arrives', async () => {
    const { result } = renderProblems('scss', 'a{', [validates('SCSS', 'a{', [unclosed])]);
    expect(result.current).toEqual({ problems: [], checking: true });
    await elapse(0);
    expect(result.current.checking).toBe(false);
    expect(result.current.problems).toEqual([unclosed]);
  });

  it('waits 600ms after typing stops before asking again, and shows it is checking meanwhile', async () => {
    const { result, rerender } = renderProblems('scss', 'a{', [validates('SCSS', 'a{', [unclosed]), validates('SCSS', 'a{}', [])]);
    await elapse(0);
    rerender({ language: 'scss', source: 'a{}' });
    // The last answer still shows, but it is about older code.
    expect(result.current).toEqual({ problems: [unclosed], checking: true });
    await elapse(599);
    expect(result.current.checking).toBe(true);
    await elapse(1);
    await elapse(0);
    expect(result.current).toEqual({ problems: [], checking: false });
  });

  it('checks Astro markup with the Astro compiler and JavaScript with the JS parser', async () => {
    const astro = renderProblems('astro', '---\n', [validates('ASTRO', '---\n', [unclosed])]);
    const js = renderProblems('javascript', 'let', [validates('JS', 'let', [])]);
    await elapse(0);
    expect(astro.result.current.problems).toEqual([unclosed]);
    expect(js.result.current).toEqual({ problems: [], checking: false });
  });

  it('stops checking (and drops old problems) when the code is cleared', async () => {
    const { result, rerender } = renderProblems('scss', 'a{', [validates('SCSS', 'a{', [unclosed])]);
    await elapse(0);
    rerender({ language: 'scss', source: '' });
    await elapse(600);
    expect(result.current).toEqual({ problems: [], checking: false });
  });
});

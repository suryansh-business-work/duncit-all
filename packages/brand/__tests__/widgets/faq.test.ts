// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/captcha', () => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({})),
}));

import { mount } from '../../src/widgets/faq';
import { flush, stubFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

describe('faq mount', () => {
  it('loads the live groups into a list root', async () => {
    document.body.innerHTML = '<div id="r" data-copy=\'{"empty":"none","error":"err"}\'></div>';
    const root = document.getElementById('r') as HTMLElement;
    stubFetch({ data: { publicFaqGroups: [{ super_category: null, faqs: [{ question: 'Q', answer: 'A' }] }] } });
    mount(root);
    await flush();
    expect(root.querySelectorAll('details')).toHaveLength(1);
  });

  it('wires the ask handler on a form root and does not fetch the list', async () => {
    document.body.innerHTML = '<form id="f"><input name="question" value="x"/></form>';
    const form = document.getElementById('f') as HTMLFormElement;
    const fetchMock = stubFetch({});
    mount(form);
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a root that was already claimed', async () => {
    document.body.innerHTML = '<div id="r" data-cms-mounted="true"></div>';
    const fetchMock = stubFetch({});
    mount(document.getElementById('r') as HTMLElement);
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

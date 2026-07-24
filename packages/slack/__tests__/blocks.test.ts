import { describe, expect, it } from 'vitest';
import {
  actions,
  button,
  context,
  divider,
  fields,
  header,
  image,
  mrkdwn,
  plainText,
  section,
} from '../src/blocks';

describe('block builders', () => {
  it('builds text objects', () => {
    expect(mrkdwn('*hi*')).toEqual({ type: 'mrkdwn', text: '*hi*' });
    expect(plainText('hi')).toEqual({ type: 'plain_text', text: 'hi', emoji: true });
    expect(plainText('hi', false)).toEqual({ type: 'plain_text', text: 'hi', emoji: false });
  });

  it('builds header and divider blocks', () => {
    expect(header('Title')).toEqual({ type: 'header', text: plainText('Title') });
    expect(divider()).toEqual({ type: 'divider' });
  });

  it('accepts a string or a text object for section', () => {
    expect(section('*bold*')).toEqual({ type: 'section', text: mrkdwn('*bold*') });
    const custom = plainText('plain');
    expect(section(custom)).toEqual({ type: 'section', text: custom });
  });

  it('builds a fields section and a context block from strings and objects', () => {
    expect(fields(['*a*', '*b*'])).toEqual({
      type: 'section',
      fields: [mrkdwn('*a*'), mrkdwn('*b*')],
    });
    const obj = plainText('x');
    expect(context(['*c*', obj])).toEqual({ type: 'context', elements: [mrkdwn('*c*'), obj] });
  });

  it('builds an image block', () => {
    expect(image('https://img/x.png', 'alt')).toEqual({
      type: 'image',
      image_url: 'https://img/x.png',
      alt_text: 'alt',
    });
  });

  it('builds a bare button with only defaults', () => {
    expect(button('Click')).toEqual({ type: 'button', text: plainText('Click') });
  });

  it('builds a button with every option applied', () => {
    expect(
      button('Open', { url: 'https://x', value: 'v1', actionId: 'a1', style: 'primary' }),
    ).toEqual({
      type: 'button',
      text: plainText('Open'),
      url: 'https://x',
      value: 'v1',
      action_id: 'a1',
      style: 'primary',
    });
  });

  it('wraps buttons in an actions block', () => {
    const b = button('Go');
    expect(actions([b])).toEqual({ type: 'actions', elements: [b] });
  });
});

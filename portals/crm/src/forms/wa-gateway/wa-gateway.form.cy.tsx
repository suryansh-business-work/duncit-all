import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WaGatewayForm, waGatewaySchema, WA_API_KEY_MAX } from '.';

// Echoing keys keeps the schema's messages assertable without the bundle.
const echo = ((key: string) => key) as Parameters<typeof waGatewaySchema>[0];
const messages = (hasKey: boolean, values: { base_url: string; api_key: string }) => {
  const result = waGatewaySchema(echo, hasKey).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('waGatewaySchema', () => {
  it('trims both fields and accepts an https gateway with a key', () => {
    const result = waGatewaySchema(echo, false).safeParse({ base_url: ' https://wa.example.test ', api_key: ' k1 ' });
    expect(result.success && result.data).toEqual({ base_url: 'https://wa.example.test', api_key: 'k1' });
  });

  it('asks for a URL when blank', () => {
    expect(messages(true, { base_url: '   ', api_key: '' })).toEqual(['crm.tools.gatewayUrlRequired']);
  });

  it('refuses a URL that is not http(s)', () => {
    expect(messages(true, { base_url: 'open-wa-server', api_key: '' })).toEqual(['crm.tools.gatewayUrlInvalid']);
    expect(messages(true, { base_url: 'ftp://wa.example.test', api_key: '' })).toEqual(['crm.tools.gatewayUrlInvalid']);
  });

  it('requires a key until one is saved, then lets a blank field keep it', () => {
    expect(messages(false, { base_url: 'https://wa.example.test', api_key: ' ' })).toEqual(['crm.tools.apiKeyRequired']);
    expect(messages(true, { base_url: 'https://wa.example.test', api_key: '' })).toEqual([]);
  });

  it('accepts a key at the cap and refuses one character more', () => {
    const base_url = 'https://wa.example.test';
    expect(messages(false, { base_url, api_key: 'k'.repeat(WA_API_KEY_MAX) })).toEqual([]);
    expect(messages(false, { base_url, api_key: 'k'.repeat(WA_API_KEY_MAX + 1) })).toEqual(['crm.tools.apiKeyTooLong']);
  });
});

describe('WaGatewayForm', () => {
  const setup = (props: Partial<Parameters<typeof WaGatewayForm>[0]> = {}) => {
    const onSubmit = vi.fn();
    const onGenerate = vi.fn();
    render(
      <WaGatewayForm
        initialBaseUrl="https://open-wa.example.test"
        hasKey={false}
        onSubmit={onSubmit}
        onGenerate={onGenerate}
        {...props}
      />,
    );
    return {
      onSubmit,
      onGenerate,
      url: () => screen.getByTestId('wa-gateway-url') as HTMLInputElement,
      key: () => screen.getByTestId('wa-gateway-key') as HTMLInputElement,
    };
  };

  it('prefills the saved URL and submits the trimmed URL and key', async () => {
    const { onSubmit, url, key } = setup();
    expect(url().value).toBe('https://open-wa.example.test');
    fireEvent.change(key(), { target: { value: '  my-key ' } });
    fireEvent.click(screen.getByTestId('wa-gateway-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ base_url: 'https://open-wa.example.test', api_key: 'my-key' });
  });

  it('refuses to continue without a key when none is saved', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByTestId('wa-gateway-submit'));
    expect(await screen.findByText('Enter the API key, or press Generate API key')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps a saved key when the field is left blank', async () => {
    const { onSubmit, key } = setup({ hasKey: true });
    expect(key()).toHaveAttribute('placeholder', 'Saved — leave blank to keep it');
    fireEvent.click(screen.getByTestId('wa-gateway-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ base_url: 'https://open-wa.example.test', api_key: '' });
  });

  it('generates a key for a valid URL only', async () => {
    const { onGenerate, url } = setup();
    fireEvent.change(url(), { target: { value: 'not a url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));
    expect(await screen.findByText('Enter the full URL, starting with https://')).toBeInTheDocument();
    expect(onGenerate).not.toHaveBeenCalled();

    fireEvent.change(url(), { target: { value: ' https://wa.example.test ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));
    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith('https://wa.example.test'));
  });

  it('shows the server error instead of the generated-key notice', () => {
    setup({ error: 'The WhatsApp gateway refused this API key.', notice: 'Key saved' });
    expect(screen.getByRole('alert')).toHaveTextContent('The WhatsApp gateway refused this API key.');
    expect(screen.queryByText('Key saved')).toBeNull();
  });

  it('shows the generated-key notice', () => {
    setup({ notice: 'Key saved' });
    expect(screen.getByText('Key saved')).toBeInTheDocument();
  });

  it('disables both actions while a save runs', () => {
    setup({ submitting: true });
    expect(screen.getByRole('button', { name: 'Generate API key' })).toBeDisabled();
    expect(screen.getByTestId('wa-gateway-submit')).toBeDisabled();
  });
});

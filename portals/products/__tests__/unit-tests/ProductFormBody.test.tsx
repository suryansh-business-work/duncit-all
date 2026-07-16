import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import ProductFormBody from '../../src/pages/inventory-page/inventory-product-page/ProductFormBody';
import { ProductFormHarness } from './form-harness';

function Dirtier() {
  const { register } = useFormContext();
  return <input aria-label="dirty-me" {...register('product_name')} />;
}

const footer = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/inventory-page/inventory-product-page/ProductAccordion', () => ({
  default: () => <div data-testid="accordion" />,
}));
vi.mock('../../src/pages/inventory-page/inventory-product-page/StickyFooter', () => ({
  default: (props: Record<string, any>) => {
    footer.props = props;
    return <div data-testid="footer" />;
  },
}));

const renderBody = (isNew: boolean, onSubmit = vi.fn(), onAfterSave = vi.fn()) =>
  render(
    <ProductFormHarness>
      <ProductFormBody
        isNew={isNew}
        categories={[]}
        logs={[]}
        movements={[]}
        analytics={[]}
        activityLoading={false}
        onCancel={vi.fn()}
        onAfterSave={onAfterSave}
        onSubmit={onSubmit}
        onError={vi.fn()}
      />
    </ProductFormHarness>,
  );

beforeEach(() => {
  footer.props = null;
});

describe('ProductFormBody', () => {
  it('renders the accordion and footer', () => {
    renderBody(true);
    expect(screen.getByTestId('accordion')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('registers the unsaved-changes guard when the form is dirty', async () => {
    render(
      <ProductFormHarness>
        <Dirtier />
        <ProductFormBody
          isNew={false}
          categories={[]}
          logs={[]}
          movements={[]}
          analytics={[]}
          activityLoading={false}
          onCancel={vi.fn()}
          onAfterSave={vi.fn()}
          onSubmit={vi.fn()}
          onError={vi.fn()}
        />
      </ProductFormHarness>,
    );
    // Typing into a registered field dirties the form → StickyFooter reflects it.
    fireEvent.change(screen.getByLabelText('dirty-me'), { target: { value: 'Changed' } });
    await waitFor(() => expect(footer.props?.dirty).toBe(true));
  });

  it('submits without closing on Save & continue', async () => {
    const onSubmit = vi.fn();
    const onAfterSave = vi.fn();
    renderBody(false, onSubmit, onAfterSave);
    footer.props?.onSaveAndContinue();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onAfterSave).not.toHaveBeenCalled();
  });

  it('submits and closes on Save when editing an existing product', async () => {
    const onSubmit = vi.fn();
    const onAfterSave = vi.fn();
    renderBody(false, onSubmit, onAfterSave);
    footer.props?.onSave();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onAfterSave).toHaveBeenCalledTimes(1));
  });

  it('does not close after saving a new product', async () => {
    const onSubmit = vi.fn();
    const onAfterSave = vi.fn();
    renderBody(true, onSubmit, onAfterSave);
    footer.props?.onSave();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onAfterSave).not.toHaveBeenCalled();
  });

  it('submits when the form fires a native submit event', async () => {
    const onSubmit = vi.fn();
    const { container } = renderBody(false, onSubmit);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});

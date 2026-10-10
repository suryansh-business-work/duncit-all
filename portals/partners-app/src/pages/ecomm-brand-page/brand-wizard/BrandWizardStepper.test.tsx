import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { BRAND_WIZARD_STEPS, brandStepStates, type BrandWizardStepKey } from '@duncit/utils';
import { renderWithProviders } from '../../../__tests__/render';
import { blankBrand } from '../schema';
import BrandWizardStepper from './BrandWizardStepper';
import { stepProblems, toFacts, type StepProblems } from './wizard-steps';

afterEach(cleanup);

const indexOf = (key: BrandWizardStepKey) => BRAND_WIZARD_STEPS.findIndex((step) => step.key === key);
const states = brandStepStates(toFacts(blankBrand, {}));
const noProblems = stepProblems({}, states, 0, '');

const mount = (problems: StepProblems, activeStep = 0, locked = false) => {
  const onJump = vi.fn();
  renderWithProviders(
    <BrandWizardStepper
      activeStep={activeStep}
      states={states}
      problems={problems}
      locked={locked}
      onJump={onJump}
      renderBody={(key) => <p data-testid="open-step-body">{key}</p>}
    />,
  );
  return onJump;
};

describe('BrandWizardStepper', () => {
  it('lists every message of a closed step in its heading, though its fields are not on screen', () => {
    mount({ ...noProblems, address: ['Enter the full address.', 'Enter a valid 6-digit PIN code.'] });

    // Only the open step's body is rendered — the address fields are not there to show their own errors.
    expect(screen.getByTestId('open-step-body').textContent).toBe('details');
    const errors = screen.getByTestId('brand-wizard-step-errors-address');
    expect(within(errors).getByText('Enter the full address.')).toBeTruthy();
    expect(within(errors).getByText('Enter a valid 6-digit PIN code.')).toBeTruthy();
    expect(errors.getAttribute('role')).toBe('status');
    // A step with nothing wrong says nothing.
    expect(screen.getByTestId('brand-wizard-step-errors-business').textContent).toBe('');
  });

  it('lets a step with a problem be opened even though the wizard has not reached it', () => {
    const onJump = mount({ ...noProblems, address: ['Enter the full address.'] });

    fireEvent.click(screen.getByRole('tab', { name: /Address/ }));

    expect(onJump).toHaveBeenCalledWith(indexOf('address'));
  });

  it('keeps a later step with nothing wrong closed until its turn', () => {
    mount(noProblems);
    // Nothing is behind the first step, complete or wrong, so no heading can be opened yet.
    expect(screen.queryAllByRole('tab')).toEqual([]);
  });

  it('opens an earlier step from its heading, and never makes the open step a control', () => {
    const onJump = mount(noProblems, indexOf('address'));

    expect(screen.getByTestId('open-step-body').textContent).toBe('address');
    expect(screen.queryByRole('tab', { name: /Address/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Brand details/ }));
    expect(onJump).toHaveBeenCalledWith(indexOf('details'));
  });

  it('lets every step of a locked brand be opened for reading', () => {
    mount(noProblems, 0, true);
    // All but the open one.
    expect(screen.getAllByRole('tab')).toHaveLength(BRAND_WIZARD_STEPS.length - 1);
  });
});

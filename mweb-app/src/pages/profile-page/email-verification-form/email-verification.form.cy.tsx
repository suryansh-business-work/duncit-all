import EmailVerificationForm from './email-verification.form';

describe('<EmailVerificationForm />', () => {
  it('renders the OTP action', () => {
    cy.mount(<EmailVerificationForm email="user@example.com" verified={false} onVerified={() => undefined} />);
    cy.contains('Send OTP').should('be.visible');
  });
});
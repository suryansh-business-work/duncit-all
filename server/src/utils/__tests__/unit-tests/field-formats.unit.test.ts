import { formatForField, formatProblem } from '@utils/field-formats';

describe('formatForField — the format a field name implies', () => {
  it.each([
    ['email', 'email'],
    ['contact_email', 'email'],
    ['invoice_support_email', 'email'],
    ['phone', 'phone'],
    ['mobile', 'phone'],
    ['owner_phone', 'phone'],
    ['phone_number', 'phone'],
    ['contact_phone_number', 'phone'],
    ['mobile_number', 'phone'],
    ['ifsc', 'ifsc'],
    ['ifsc_code', 'ifsc'],
    ['upi_id', 'upi_id'],
    ['payout_upi_id', 'upi_id'],
    ['gstin', 'gstin'],
    ['business_gstin', 'gstin'],
    ['pincode', 'postcode'],
    ['pin_code', 'postcode'],
    ['delivery_pincode', 'postcode'],
    ['website', 'website'],
    ['website_url', 'website'],
  ])('reads %s as %s', (name, format) => {
    expect(formatForField(name)).toBe(format);
  });

  it.each([
    'email_enabled',
    'email_domain',
    'email_max_count',
    'per_phone_limit',
    'phone_key',
    'phone_extension',
    'android_phone_screenshots',
    'whatsapp_is_mobile',
    'website_header_logo_url',
    'mobile_logo_url',
    'name',
    'Email',
  ])('reads %s as no format — names are matched whole, and exactly', (name) => {
    expect(formatForField(name)).toBeNull();
  });
});

describe('formatProblem', () => {
  it.each([
    ['email', 'asha.rao+pods@gmail.co.in'],
    ['phone', '9876543210'],
    ['phone', '+91 98765 43210'],
    ['phone', '(080) 4567-8901'],
    ['ifsc_code', 'HDFC0001234'],
    ['ifsc_code', 'hdfc0001234'],
    ['upi_id', 'asha.rao@okicici'],
    ['gstin', '29ABCDE1234F1Z5'],
    ['gstin', '29abcde1234f1z5'],
    ['pincode', '560001'],
    ['pincode', '1010'],
    ['website', 'https://duncit.com/pods?city=blr'],
    ['website', 'http://cafe.example.in'],
    ['website', 'duncit.com'],
    ['email', '  asha@duncit.com  '],
  ])('accepts %s = %j', (name, value) => {
    expect(formatProblem(name, value)).toBeNull();
  });

  it.each([
    ['email', 'asha@duncit', 'must be a valid email address'],
    ['email', 'asha duncit.com', 'must be a valid email address'],
    ['email', `${'a'.repeat(250)}@x.co`, 'must be a valid email address'],
    ['phone', 'N/A', 'must be a phone number of 6 to 15 digits'],
    ['phone', '12345', 'must be a phone number of 6 to 15 digits'],
    ['phone', '1234567890123456', 'must be a phone number of 6 to 15 digits'],
    ['phone', '98765x43210', 'must be a phone number of 6 to 15 digits'],
    ['ifsc_code', 'HDFC1001234', 'must be an 11-character IFSC such as HDFC0001234'],
    ['upi_id', 'asha@', 'must be a UPI ID such as name@bank'],
    ['gstin', '29ABCDE1234F15', 'must be a 15-character GSTIN'],
    ['pincode', '560 001', 'must be a PIN code of digits only'],
    ['pincode', '123', 'must be a PIN code of digits only'],
    ['website', 'ftp://files.example.com', 'must be a website address such as https://example.com'],
    ['website', 'localhost', 'must be a website address such as https://example.com'],
    ['website', 'javascript:alert(1)', 'must be a website address such as https://example.com'],
    ['website', 'my site.com', 'must be a website address such as https://example.com'],
    ['website', 'http://', 'must be a website address such as https://example.com'],
  ])('refuses %s = %j: %s', (name, value, expectation) => {
    expect(formatProblem(name, value)).toBe(expectation);
  });

  it('leaves an empty or blank value to the required check', () => {
    expect(formatProblem('email', '')).toBeNull();
    expect(formatProblem('email', '   ')).toBeNull();
  });

  it('holds a field whose name implies no format to nothing', () => {
    expect(formatProblem('notes', 'anything @ all')).toBeNull();
  });
});

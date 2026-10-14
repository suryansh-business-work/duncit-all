import * as XLSX from 'xlsx';
import { MAX_BULK_EMAILS, extractEmails } from '../../emailVerification.csv';

const csv = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('extractEmails', () => {
  it('reads the column whose header names an email, lowercased, de-duplicated, in file order', () => {
    const file = csv('Name,E-mail,City\nAsha,Asha@Example.com,Pune\nRavi,ravi@example.com,Delhi\nAsha again,asha@example.com,Pune\n');
    expect(extractEmails(file)).toEqual(['asha@example.com', 'ravi@example.com']);
  });

  it('keeps malformed values so the check can record them as INVALID, and skips blanks', () => {
    const file = csv('email\nnot-an-email\n\nok@example.com\n');
    expect(extractEmails(file)).toEqual(['not-an-email', 'ok@example.com']);
  });

  it('finds the email column of a file with no header row by its contents', () => {
    const file = csv('Asha,asha@example.com\nRavi,ravi@example.com\nMeera,meera@example.com\n');
    expect(extractEmails(file)).toEqual(['asha@example.com', 'ravi@example.com', 'meera@example.com']);
  });

  it('rejects an empty upload', () => {
    expect(() => extractEmails('')).toThrow('No file content provided');
  });

  it('rejects a file with no email column', () => {
    expect(() => extractEmails(csv('Name,City\nAsha,Pune\n'))).toThrow(/No email column found/);
  });

  it('rejects an email column with nothing in it', () => {
    expect(() => extractEmails(csv('Name,Email\nAsha,\nRavi,\n'))).toThrow('The email column is empty');
  });

  it(`refuses more than ${MAX_BULK_EMAILS} distinct addresses`, () => {
    const rows = Array.from({ length: MAX_BULK_EMAILS + 1 }, (_, i) => `user${i}@example.com`).join('\n');
    expect(() => extractEmails(csv(`email\n${rows}\n`))).toThrow(/split it into files of up to 5000/);
  });

  it('accepts exactly the limit', () => {
    const rows = Array.from({ length: MAX_BULK_EMAILS }, (_, i) => `user${i}@example.com`).join('\n');
    expect(extractEmails(csv(`email\n${rows}\n`))).toHaveLength(MAX_BULK_EMAILS);
  });

  it('reports a file the spreadsheet reader cannot open', () => {
    const read = jest.spyOn(XLSX, 'read').mockImplementationOnce(() => {
      throw new Error('corrupt zip');
    });
    expect(() => extractEmails(csv('anything'))).toThrow('Could not read the uploaded file');
    read.mockRestore();
  });

  it('reports a workbook without a sheet', () => {
    const read = jest.spyOn(XLSX, 'read').mockReturnValueOnce({ SheetNames: [], Sheets: {} } as unknown as XLSX.WorkBook);
    expect(() => extractEmails(csv('anything'))).toThrow('The uploaded file has no sheet');
    read.mockRestore();
  });
});

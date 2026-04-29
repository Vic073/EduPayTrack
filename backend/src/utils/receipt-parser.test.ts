import assert from 'node:assert/strict';
import test from 'node:test';

import { parseReceiptText } from './receipt-parser';

test('parseReceiptText extracts reference, amount, date, and depositor from FastServe-style receipt text', () => {
    const sample = `
        National Bank FastServe
        Payment/Send Details
        Reference Number: EDU/2026/00451
        Amount: MWK 450,000.00
        Date: 2026-04-27
        Depositor: Chikondi Banda
    `;

    const result = parseReceiptText(sample);

    assert.equal(result.reference, 'EDU/2026/00451');
    assert.equal(result.amount, 450000);
    assert.equal(result.paymentDate, '2026-04-27');
    assert.equal(result.depositorName, 'Chikondi Banda');
    assert.ok(result.confidence >= 0.8);
});

test('parseReceiptText prefers a labeled numeric transaction id for Standard Bank style receipts', () => {
    const sample = `
        Standard Bank Malawi
        Transaction with Transaction ID
        Transaction ID: 123456789012
        My Reference: BED/2026/991
        Amount Paid MWK 120,500
        Date: 27/04/2026
    `;

    const result = parseReceiptText(sample);

    assert.equal(result.reference, '123456789012');
    assert.equal(result.amount, 120500);
    assert.equal(result.paymentDate, '27/04/2026');
});

test('parseReceiptText avoids selecting date-like values as references', () => {
    const sample = `
        National Bank of Malawi
        Cash Deposit
        Date: 2026-04-27
        Amount Deposited: MWK 98,000
        Reference: 2026-04-27
        Teller: Desk 4
    `;

    const result = parseReceiptText(sample);

    assert.equal(result.reference, null);
    assert.equal(result.amount, 98000);
    assert.equal(result.paymentDate, '2026-04-27');
});

test('parseReceiptText extracts account name style depositor labels', () => {
    const sample = `
        Airtel Money Receipt
        Account Name: Mary Jane Phiri
        Transaction ID: AMX-2026-77881
        Amount Paid: MWK 75,000
        Date: 2026-04-28
    `;

    const result = parseReceiptText(sample);

    assert.equal(result.depositorName, 'Mary Jane Phiri');
    assert.equal(result.reference, 'AMX-2026-77881');
});

test('parseReceiptText ignores non-person values after name-like labels', () => {
    const sample = `
        Mobile Transfer Receipt
        Name: National Bank of Malawi
        Reference Number: MBT/2026/9981
        Amount: MWK 64,500
        Date: 2026-04-28
    `;

    const result = parseReceiptText(sample);

    assert.equal(result.depositorName, null);
    assert.equal(result.reference, 'MBT/2026/9981');
});

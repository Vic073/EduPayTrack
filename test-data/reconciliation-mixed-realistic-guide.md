# Reconciliation Mixed Test CSV

File: [reconciliation-mixed-realistic.csv](/C:/Users/Victor%20Chilomo/OneDrive/Desktop/EduPayTrack/test-data/reconciliation-mixed-realistic.csv)

This CSV is meant to test the imported statement matcher with a mix of easy, messy, and failure-prone rows.

## Best use

1. Seed or create a few pending payments first.
2. Make sure at least one pending payment looks like:
   - `method`: `MOBILE_CREDIT_CARD`
   - `externalReference`: `DEMO-MM-002`
   - `amount`: `100000`
   - `paymentDate`: `2026-03-10`
   - `payerName`: `Demo Guardian`
3. Import the CSV from the admin reconciliation flow.

## What the rows are testing

- Rows 1-3: clean and near-clean matches for `DEMO-MM-002`. These are the most likely to become strong matches or assisted approvals.
- Row 4: partial reference match because of the extra suffix `X`.
- Row 5: exact reference but wrong amount.
- Row 6: exact reference and amount, but the date is outside the 1-day and 3-day bonus windows.
- Row 7: references a demo payment that is seeded as `APPROVED`, so it should not match if your system only considers `PENDING` payments.
- Rows 8-12: realistic unmatched imports for additional manual testing.
- Row 13: tests receipt-number thinking. The current matcher prefers `externalReference` over `receiptNumber` when both exist on the payment record, so this may not match even if the receipt number looks correct.
- Rows 14-15: blank references. Good for checking how much the system can still infer from amount, date, and name alone.
- Row 16: tests name confusion where the statement uses the student name instead of the payer name.
- Row 17: tests separator normalization on the statement side.
- Row 18: similar-looking but nonexistent reference.
- Rows 19-20: realistic unmatched credits for exception-queue behavior.

## Important note about seeded demo data

The current demo seed in [backend/scripts/seed-demo.js](/C:/Users/Victor%20Chilomo/OneDrive/Desktop/EduPayTrack/backend/scripts/seed-demo.js) creates only one pending payment:

- `externalReference`: `DEMO-MM-002`
- `amount`: `100000`
- `paymentDate`: `2026-03-10`
- `payerName`: `Demo Guardian`

That means rows built around `DEMO-MM-002` are the most useful immediately after seeding. The other rows are there to exercise no-match, weak-match, and review scenarios.

## Suggested next test after this file

After you import this mixed file once, the next high-value step is a second CSV based on your real bank or mobile-money export headers so we can confirm the automatic column detection works without remapping.

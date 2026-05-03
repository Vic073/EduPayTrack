# Demo Reference + Amount CSV

File: [demo-reference-amount-template.csv](/C:/Users/Victor%20Chilomo/OneDrive/Desktop/EduPayTrack/test-data/demo-reference-amount-template.csv)

Use this file for the simplest possible reconciliation demo.

## What to edit

Replace each `reference` with the exact reference number from the receipt.

Replace each `amount` with the exact payment amount from the same receipt.

## Required format

- Keep the header exactly as `reference,amount`
- Keep one payment per row
- Do not add extra columns for the demo
- The reference in the CSV must exactly match the reference entered in the upload form
- The amount in the CSV must exactly match the amount entered in the upload form

## Demo flow

1. Open [demo-reference-amount-template.csv](/C:/Users/Victor%20Chilomo/OneDrive/Desktop/EduPayTrack/test-data/demo-reference-amount-template.csv)
2. Replace the sample rows with your own demo receipt values
3. Save the file
4. Import the CSV from the admin statement import page
5. Upload the matching receipt as a student
6. Enter the same `reference` and `amount` from the CSV
7. Submit the payment

If both values match, the payment should be approved instantly.

## Example

If your receipt has:

- Reference: `NBM782331`
- Amount: `450000`

Then your CSV row should be:

```csv
reference,amount
NBM782331,450000
```

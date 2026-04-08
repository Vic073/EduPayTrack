-- CreateTable
CREATE TABLE "StatementImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "headers" TEXT[],
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL,
    "columnMapping" JSONB,

    CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementImportRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "reference" TEXT,
    "payerName" TEXT,
    "description" TEXT,
    "amount" DECIMAL(12,2),
    "transactionDate" TIMESTAMP(3),
    "matchState" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "resolvedPaymentId" TEXT,
    "autoApprovedPaymentId" TEXT,
    "reconciledAt" TIMESTAMP(3),

    CONSTRAINT "StatementImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementImport_uploadedBy_uploadedAt_idx" ON "StatementImport"("uploadedBy", "uploadedAt");

-- CreateIndex
CREATE INDEX "StatementImportRow_importId_rowNumber_idx" ON "StatementImportRow"("importId", "rowNumber");

-- AddForeignKey
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImportRow" ADD CONSTRAINT "StatementImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

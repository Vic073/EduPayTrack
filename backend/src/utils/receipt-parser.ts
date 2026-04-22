const amountPatterns = [
    /(?:amount|total|paid|sum|balance|net amount|credited|deposited)\s*[:\-]?\s*(?:mwk|mk|k)?\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]{1,2})?)/i,
    /(?:mwk|mk|k)\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]{1,2})?)/i,
    /\b((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]{1,2})?)\s*(?:mwk|mk|k)\b/i,
];

const referenceLabelPattern =
    /(?:reference(?:\s*(?:number|no|#))?|ref(?:erence)?(?:\s*(?:number|no|#))?|transaction\s*(?:id|reference|ref|no|number)|txn\s*(?:id|reference|ref|no|number)|trx\s*(?:id|reference|ref|no|number)|trace(?:\s*no)?|rrn|my\s*reference|their\s*reference)\s*[:#\-]?\s*/i;

const strictTransactionIdLabelPattern =
    /(?:transaction\s*id|txn\s*id|trx\s*id)\s*[:#\-]?\s*/i;

const nonReferenceContextPattern =
    /\b(?:account|date|value\s*date|phone|depositor|teller|amount|credited|signature|narration|name)\b/i;

const datePatterns = [
    /\b((?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/,
    /\b(\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2})\b/,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:19|20)\d{2})\b/i,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+(?:19|20)\d{2})\b/i,
];

const registrationPatterns = [
    /(?:reg\s*number|registration|reg\s*no|student\s*id|reg\s*#|id\s*no)\s*[:\-]?\s*([A-Za-z0-9\-]{4,})/i,
    /\b(REG-[A-Za-z0-9]{4,})\b/i,
];

const codePatterns = [
    /(?:code\s*number|code|verification\s*code|code\s*#)\s*[:\-]?\s*([A-Za-z0-9\-]{4,})/i,
    /\b(CODE-[A-Za-z0-9]{4,})\b/i,
];

const depositorPatterns = [
    /(?:depositor|paid by|received from|name|customer(?:'s)? name)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\s*MWK|\s*[0-9]|$)/i,
];

type ReferenceCandidate = {
    score: number;
    token: string;
};

type ReceiptTemplate = 'NBM_FASTSERVE' | 'NBM_DEPOSIT' | 'STANDARD_BANK' | 'GENERIC';

const normalizeAmount = (rawAmount: string) => Number(rawAmount.replace(/,/g, ''));

const cleanupToken = (value: string) => value.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9/-]+$/g, '').trim();

const isDateLikeToken = (token: string) =>
    /^(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(token) ||
    /^\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}$/.test(token) ||
    /^(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}t\d{1,2}/i.test(token);

const isLikelyReference = (value: string, allowPureNumeric = false) => {
    const normalized = cleanupToken(value);
    if (normalized.length < 5 || normalized.length > 40) {
        return false;
    }

    if (isDateLikeToken(normalized)) {
        return false;
    }

    const hasLetter = /[A-Za-z]/.test(normalized);
    const hasNumber = /\d/.test(normalized);
    if (hasLetter && hasNumber) {
        return true;
    }

    return allowPureNumeric && /^\d{6,14}$/.test(normalized);
};

const detectReceiptTemplate = (rawText: string): ReceiptTemplate => {
    const normalized = rawText.toLowerCase();

    if (normalized.includes('fastserve') || normalized.includes('payment/send details')) {
        return 'NBM_FASTSERVE';
    }

    if (
        normalized.includes('national bank of malawi') ||
        normalized.includes('cash deposit') ||
        normalized.includes('amt deposited')
    ) {
        return 'NBM_DEPOSIT';
    }

    if (normalized.includes('standard bank') || normalized.includes('transaction with transaction id')) {
        return 'STANDARD_BANK';
    }

    return 'GENERIC';
};

const extractFromLabeledLine = (lines: string[], labelPattern: RegExp, allowPureNumeric = false): string | null => {
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!labelPattern.test(line)) {
            continue;
        }

        const inlineMatch = line.match(/[:#-]\s*([A-Za-z0-9][A-Za-z0-9/-]{4,39})/);
        if (inlineMatch?.[1] && isLikelyReference(inlineMatch[1], allowPureNumeric)) {
            return cleanupToken(inlineMatch[1]);
        }

        const tokens = line.match(/\b([A-Za-z0-9][A-Za-z0-9/-]{4,39})\b/g) || [];
        for (const token of tokens) {
            if (isLikelyReference(token, allowPureNumeric) && !labelPattern.test(token)) {
                return cleanupToken(token);
            }
        }

        const nextLine = lines[i + 1];
        if (nextLine) {
            const nextTokenMatch = nextLine.match(/\b([A-Za-z0-9][A-Za-z0-9/-]{4,39})\b/);
            if (nextTokenMatch?.[1] && isLikelyReference(nextTokenMatch[1], allowPureNumeric)) {
                return cleanupToken(nextTokenMatch[1]);
            }
        }
    }

    return null;
};

const extractTemplateReference = (rawText: string): string | null => {
    const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const template = detectReceiptTemplate(rawText);

    if (template === 'NBM_FASTSERVE') {
        return (
            extractFromLabeledLine(lines, /reference\s*number/i) ||
            extractFromLabeledLine(lines, /\bref(?:erence)?\b/i)
        );
    }

    if (template === 'NBM_DEPOSIT') {
        return (
            extractFromLabeledLine(lines, /\bref(?:erence)?(?:\s*transaction)?\b/i) ||
            extractFromLabeledLine(lines, /transaction\s*(?:id|ref|reference|number)/i)
        );
    }

    if (template === 'STANDARD_BANK') {
        return (
            extractFromLabeledLine(lines, /transaction\s*id/i, true) ||
            extractFromLabeledLine(lines, /my\s*reference/i) ||
            extractFromLabeledLine(lines, /their\s*reference/i)
        );
    }

    return null;
};

const scoreReferenceCandidate = (token: string, line: string) => {
    const normalizedToken = cleanupToken(token);
    if (!normalizedToken) {
        return Number.NEGATIVE_INFINITY;
    }

    const normalizedLine = line.toLowerCase();
    const allowPureNumeric = strictTransactionIdLabelPattern.test(line);
    if (!isLikelyReference(normalizedToken, allowPureNumeric)) {
        return Number.NEGATIVE_INFINITY;
    }

    let score = 0;
    if (referenceLabelPattern.test(line)) score += 8;
    if (strictTransactionIdLabelPattern.test(line)) score += 4;
    if (nonReferenceContextPattern.test(line) && !referenceLabelPattern.test(line)) score -= 8;
    if (normalizedToken.includes('/')) score += 3;
    if (/[A-Za-z]/.test(normalizedToken) && /\d/.test(normalizedToken)) score += 2;
    if (/^\d{6,14}$/.test(normalizedToken)) score -= 1;
    if (isDateLikeToken(normalizedToken)) score -= 10;
    if (normalizedLine.includes('bed/') || normalizedLine.includes('ssc/')) score -= 6;

    return score;
};

const pickBestCandidate = (candidates: ReferenceCandidate[]): string | null => {
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    return sorted[0].score >= 2 ? sorted[0].token : null;
};

const extractReference = (rawText: string): string | null => {
    const templateReference = extractTemplateReference(rawText);
    if (templateReference) {
        return templateReference;
    }

    const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const candidates: ReferenceCandidate[] = [];
    const tokenPattern = /\b([A-Za-z0-9][A-Za-z0-9/-]{4,39})\b/g;

    for (let i = 0; i < lines.length; i += 1) {
        const currentLine = lines[i];
        const explicitPattern =
            /(?:reference(?:\s*(?:number|no|#))?|ref(?:erence)?(?:\s*(?:number|no|#))?|transaction\s*(?:id|reference|ref|no|number)|txn\s*(?:id|reference|ref|no|number)|trx\s*(?:id|reference|ref|no|number)|trace(?:\s*no)?|rrn|my\s*reference|their\s*reference)\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{4,39})/i;
        const explicitMatch = currentLine.match(explicitPattern);
        if (explicitMatch?.[1]) {
            const token = cleanupToken(explicitMatch[1]);
            candidates.push({ token, score: scoreReferenceCandidate(token, currentLine) + 3 });
        }

        if (referenceLabelPattern.test(currentLine) && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextTokenMatch = nextLine.match(/\b([A-Za-z0-9][A-Za-z0-9/-]{4,39})\b/);
            if (nextTokenMatch?.[1]) {
                const nextToken = cleanupToken(nextTokenMatch[1]);
                candidates.push({ token: nextToken, score: scoreReferenceCandidate(nextToken, currentLine) + 1 });
            }
        }

        let inlineTokenMatch = tokenPattern.exec(currentLine);
        while (inlineTokenMatch) {
            const token = cleanupToken(inlineTokenMatch[1]);
            candidates.push({ token, score: scoreReferenceCandidate(token, currentLine) });
            inlineTokenMatch = tokenPattern.exec(currentLine);
        }
    }

    return pickBestCandidate(candidates);
};

export const parseReceiptText = (rawText: string) => {
    const normalizedText = rawText.replace(/\r/g, '').trim();
    const singleLineText = normalizedText.replace(/\s+/g, ' ').trim();

    const matchedAmount = amountPatterns.map((p) => singleLineText.match(p)).find(Boolean);
    const matchedDate = datePatterns.map((p) => singleLineText.match(p)).find(Boolean);
    const matchedReg = registrationPatterns.map((p) => singleLineText.match(p)).find(Boolean);
    const matchedCode = codePatterns.map((p) => singleLineText.match(p)).find(Boolean);
    const matchedDepositor = depositorPatterns.map((p) => singleLineText.match(p)).find(Boolean);

    const amount = matchedAmount?.[1] ? normalizeAmount(matchedAmount[1]) : null;
    const reference = extractReference(normalizedText);
    const paymentDate = matchedDate?.[1] ?? null;
    const registrationNumber = matchedReg?.[1] ?? null;
    const codeNumber = matchedCode?.[1] ?? null;
    const depositorName = matchedDepositor?.[1]?.trim() || null;

    const confidenceSignals = [
        amount !== null,
        reference !== null,
        paymentDate !== null,
        registrationNumber !== null || codeNumber !== null,
        depositorName !== null,
    ].filter(Boolean).length;

    return {
        rawText: singleLineText,
        amount,
        reference,
        paymentDate,
        registrationNumber,
        codeNumber,
        depositorName,
        confidence: Number((confidenceSignals / 5).toFixed(2)),
    };
};

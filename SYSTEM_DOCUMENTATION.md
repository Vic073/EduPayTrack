# EduPayTrack - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [OCR Implementation with Groq](#ocr-implementation-with-groq)
3. [System Architecture](#system-architecture)
4. [Backend API Structure](#backend-api-structure)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [Key Features Implementation](#key-features-implementation)

---

## System Overview

EduPayTrack is a comprehensive institutional payment and fee management system designed for educational institutions. It streamlines student fee payments, administrative verification, and financial tracking through an AI-powered OCR scanning engine and role-based access control.

### Core Capabilities
- **AI OCR Scanning**: Automated data extraction from payment receipts
- **Multi-Role Support**: Admin, Accounts, and Student roles with granular permissions
- **Payment Verification Workflow**: Upload → OCR Scan → Admin Review → Approval
- **Audit Trails**: Complete logging of all system actions for accountability
- **Real-time Notifications**: Payment status updates and reminder campaigns
- **Financial Reporting**: Collection analytics and statement generation

---

## OCR Implementation with Groq

### Overview
The OCR (Optical Character Recognition) system uses a **dual-engine approach** combining Groq's LLama-4 vision model as the primary engine and Python EasyOCR as a fallback for robust receipt data extraction.

### Architecture

```
Receipt Image Upload
    ↓
Primary: Groq Vision API (Llama-4)
    ↓
Fallback: Python EasyOCR Engine
    ↓
Text Parsing & Data Extraction
    ↓
Structured Data (Amount, Reference, Date)
```

### Implementation Details

#### 1. Primary OCR Engine - Groq Vision

**Location**: `backend/src/services/upload.service.ts`

**Model**: `meta-llama/llama-4-scout-17b-16e-instruct`

**Key Features**:
- Direct image-to-text extraction via vision API
- Structured JSON response format
- High accuracy for Malawian bank receipts (NBM, Standard Bank)
- Template-specific extraction rules

**API Configuration**:
```typescript
const groqSupportedMimeTypes = new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
]);
```

**Prompt Engineering**:
```
System: "You extract payment data from school fee receipts. 
Return only valid JSON. Find the true receipt reference number 
or transaction id shown on the receipt. Never use dates, account 
numbers, phone numbers, depositor numbers, or names as the 
reference number."

Response Format: {
    reference_number: string | null,
    amount: number | null,
    payment_date: string | null,
    bank_type: string | null,
    notes: string | null,
    raw_text_preview: string | null
}
```

#### 2. Fallback OCR Engine - Python EasyOCR

**Location**: `backend/src/utils/ocr_engine.py`

**Implementation**:
```python
import easyocr

def scan_receipt(image_path):
    reader = easyocr.Reader(['en'], verbose=False)
    results = reader.readtext(image_path, detail=0)
    return " ".join(results)
```

**Features**:
- Local processing (no API dependency)
- UTF-8 output handling for Windows compatibility
- JSON output format for Node.js integration

#### 3. Receipt Text Parser

**Location**: `backend/src/utils/receipt-parser.ts`

**Template Detection**:
- **NBM FastServe**: `fastserve`, `payment/send details`
- **NBM Cash Deposit**: `national bank of malawi`, `cash deposit`
- **Standard Bank**: `standard bank`, `transaction with transaction id`

**Extraction Patterns**:

```typescript
// Amount patterns (Malawian Kwacha formats)
const amountPatterns = [
    /(?:amount|total|paid|sum|balance)\s*[:\-]?\s*(?:mwk|mk|k)?\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]{1,2})?)/i,
    /(?:mwk|mk|k)\s*((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]{1,2})?)/i,
];

// Reference number patterns
const referenceLabelPattern =
    /(?:reference(?:\s*(?:number|no|#))?|ref(?:erence)?|transaction\s*(?:id|reference)|txn\s*(?:id|reference)|trace(?:\s*no)?)/i;
```

**Reference Extraction Algorithm**:
1. Detect receipt template (bank-specific)
2. Apply template-specific extraction rules
3. Score candidate references based on:
   - Presence of reference labels (+8 points)
   - Strict transaction ID patterns (+4 points)
   - Alphanumeric composition (+2 points)
   - Slash separators (+3 points)
   - Date-like patterns (-10 points)
4. Select highest scoring candidate (threshold: 2)

#### 4. OCR Service Flow

```typescript
export const scanUploadedReceipt = async (filePath: string): Promise<ReceiptScanResult> => {
    // Try Groq first
    let groqResult = await scanReceiptWithGroq(filePath);
    if (groqResult.reference && groqResult.amount !== null) {
        return groqResult;
    }
    
    // Fallback to Python OCR
    const rawText = await scanReceiptWithPython(filePath);
    const parsed = parseReceiptText(rawText);
    
    // Merge results if both partial
    if (groqResult) {
        return mergeScanResults(groqResult, pythonResult);
    }
    
    return pythonResult;
};
```

**Confidence Calculation**:
```typescript
const confidenceSignals = [
    amount !== null,
    reference !== null,
    paymentDate !== null,
    registrationNumber !== null || codeNumber !== null,
    depositorName !== null,
].filter(Boolean).length;

confidence = signalsCount / 5; // 0.0 to 1.0
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/upload` | POST | Upload receipt image |
| `/api/payments/scan` | POST | OCR scan uploaded receipt |
| `/api/payments/ocr-preview` | POST | Preview OCR from text input |

### Error Handling

**Error Codes**:
- `OCR_UNAVAILABLE`: Groq API key not configured
- `OCR_UNSUPPORTED_FILE`: File type not supported (JPG, PNG, WebP only)
- `OCR_INVALID_RESPONSE`: Malformed API response
- `OCR_PROCESS_FAILED`: Groq processing error
- `OCR_ALL_ENGINES_FAILED`: Both Groq and Python OCR failed

---

## System Architecture

### Tech Stack

**Backend**:
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **ORM**: Prisma with PostgreSQL
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer with disk storage
- **OCR**: Groq Vision API + Python EasyOCR
- **PDF Generation**: pdfkit

**Frontend**:
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Routing**: React Router DOM
- **Styling**: TailwindCSS with HSL color variables
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context + Hooks
- **HTTP Client**: Native fetch with custom wrapper
- **Notifications**: Sonner toast notifications

**Database**:
- **Primary**: PostgreSQL
- **Schema Management**: Prisma Migrate
- **Connection**: Prisma Client

### Directory Structure

```
EduPayTrack/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment & app config
│   │   ├── generated/      # Prisma generated client
│   │   ├── lib/            # Utilities (prisma, async-handler)
│   │   ├── middleware/     # Auth, error handling, audit
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   ├── utils/          # OCR engine, receipt parser
│   │   └── index.ts        # App entry point
│   └── uploads/            # Receipt image storage
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── components/  # React components
│       │   ├── lib/         # API client, utilities
│       │   ├── screens/     # Page components
│       │   └── state/       # Context providers
│       └── components/ui/   # shadcn/ui components
│
└── docs/                   # Documentation
```

---

## Backend API Structure

### Route Organization

```typescript
// Main API Router
apiRouter.use('/registry', registryRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/students', studentRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/notifications', notificationRouter);
```

### Authentication Routes (`/api/auth`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/me` | GET | Authenticated | Get current user |
| `/login` | POST | Public | User login |
| `/register/student` | POST | Public | Student registration |
| `/logout` | POST | Authenticated | Logout user |
| `/change-password` | POST | Authenticated | Change password |
| `/forgot-password` | POST | Public | Request password reset |
| `/reset-password` | POST | Public | Reset password with token |

### Payment Routes (`/api/payments`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/mine` | GET | Student | Get my payments |
| `/upload` | POST | Student | Upload receipt |
| `/scan` | POST | Student/Admin/Accounts | OCR scan receipt |
| `/ocr-preview` | POST | Student/Admin/Accounts | Preview OCR |
| `/` | POST | Student | Submit payment |
| `/:id/review` | POST | Admin/Accounts | Review payment |
| `/:id/verify` | POST | Admin | Verify payment |
| `/:id/reconcile` | POST | Admin | Reconcile payment |

### Admin Routes (`/api/admin`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/users` | GET/POST | Admin | List/Create users |
| `/users/:id` | PATCH/DELETE | Admin | Update/Delete user |
| `/users/:id/deactivate` | POST | Admin | Deactivate user |
| `/users/:id/suspend` | POST | Admin | Suspend user |
| `/audit-logs` | GET | Admin | Get audit logs |
| `/statement-imports` | GET/POST | Accounts | Bank statement handling |
| `/students/:id/payments` | GET | Admin | Student payment history |

### Student Routes (`/api/students`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/me` | GET | Student | Get my dashboard |
| `/me/statement.pdf` | GET | Student | Download statement |
| `/me/clearance-letter.pdf` | GET | Student | Download clearance |

### Notification Routes (`/api/notifications`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/` | GET | Authenticated | Get my notifications |
| `/:id/read` | PATCH | Authenticated | Mark as read |
| `/read-all` | PATCH | Authenticated | Mark all read |
| `/admin-send` | POST | Admin/Accounts | Send bulk notifications |
| `/campaigns` | GET/POST | Admin/Accounts | Manage reminder campaigns |

---

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider (context)
├── ThemeProvider
├── Layout
│   ├── Sidebar (role-based navigation)
│   └── Header (notifications, profile)
└── Routes
    ├── Public
    │   ├── Landing
    │   └── Login
    └── Protected
        ├── Student Routes
        │   ├── Dashboard
        │   ├── UploadPayment
        │   ├── PaymentHistory
        │   └── Notifications
        ├── Admin Routes
        │   ├── Dashboard
        │   ├── VerifyPayments
        │   ├── UserManagement
        │   ├── StudentManagement
        │   ├── AuditLogs
        │   └── Reports
        └── Shared
            └── Settings
```

### State Management

**Auth Context** (`app/state/auth-context.tsx`):
- User authentication state
- JWT token management
- Role-based navigation items
- Notification polling
- Login/logout/register functions

**Accessibility Context** (`app/state/accessibility-context.tsx`):
- Reduced motion preference
- High contrast mode
- Large text mode
- Theme management

### API Client

**Core Features** (`app/lib/api.ts`):
```typescript
// Key capabilities:
- JWT token automatic attachment
- FormData handling (no Content-Type override)
- Automatic retry (GET only, max 2 retries)
- Timeout handling (30s default)
- Error unwrapping (success/data/message)
- File download support
```

---

## Database Schema

### Core Entities

**User**:
- id, email, password (hashed)
- role: STUDENT | ADMIN | ACCOUNTS
- firstName, lastName, phone
- isActive, emailVerified
- createdAt, updatedAt

**Student**:
- id, userId (relation)
- studentCode (unique)
- program, yearOfStudy
- nationalId, gender
- parentPhone
- address, city, district
- emergencyContact

**Payment**:
- id, studentId
- amount, method
- externalReference, receiptNumber
- proofUrl (receipt image path)
- paymentDate, submittedAt
- status: PENDING | APPROVED | REJECTED
- reviewedBy, reviewedAt
- notes, reviewNotes

**FeeStructure**:
- id, name
- amount, academicYear
- semester, dueDate
- program, yearOfStudy
- type: TUITION | HOSTEL | EXAM | LIBRARY

**AuditLog**:
- id, action
- actorId, actorRole
- targetType, targetId
- timestamp, ipAddress
- userAgent, sessionId
- details (JSON), reason

**Notification**:
- id, userId
- title, message
- type, read
- createdAt

---

## Authentication & Security

### JWT Implementation

**Token Storage**: localStorage (`edu-pay-track-token`)

**Token Lifecycle**:
1. Login → Server returns JWT → Stored in localStorage
2. API calls → Token attached as `Authorization: Bearer <token>`
3. Logout → Token cleared from localStorage

**Middleware** (`middleware/auth.ts`):
```typescript
// Token validation
const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
req.user = { userId: decoded.sub, role: decoded.role };
```

### Role-Based Access Control

**Roles**:
- `STUDENT`: Submit payments, view history, download statements
- `ACCOUNTS`: Review payments, generate reports, manage campaigns
- `ADMIN`: Full access including user management, verification, audit logs

**Permission Matrix**:
```typescript
const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new AppError('Access denied', 403);
        }
        next();
    };
};
```

### Audit Trail Security

Every action is logged with:
- Actor identity (user ID, role, email)
- Action details (type, target, changes)
- Session context (IP, user agent, session ID)
- Timestamp

---

## Key Features Implementation

### 1. Payment Workflow

```
Student                    System                     Admin
   |                         |                         |
   |-- Upload Receipt ------>|                         |
   |                         |-- Save File             |
   |<-- File URL ------------|                         |
   |                         |                         |
   |-- OCR Scan Request --->|                         |
   |                         |-- Groq Vision API       |
   |<-- Extracted Data -----|                         |
   |                         |                         |
   |-- Submit Payment ------>|
   |  (with OCR data)        |                         |
   |                         |-- Create PENDING        |
   |<-- Confirmation --------|                         |
   |                         |                         |
   |                         |-- Notify Admin -------->|
   |                         |                         |-- Review
   |                         |<-- Approve/Reject ------|
   |<-- Status Update -------|                         |
```

### 2. OCR Scanning Flow

```
Upload
  ↓
Validate File (JPG/PNG/WebP)
  ↓
Primary: Groq Vision
  - Convert to base64
  - Send to meta-llama/llama-4-scout
  - Parse JSON response
  ↓
If Incomplete → Python EasyOCR Fallback
  - Execute ocr_engine.py
  - Parse raw text
  - Apply receipt-parser patterns
  ↓
Merge Results
  ↓
Return Structured Data:
  { amount, reference, paymentDate, confidence, provider }
```

### 3. Notification System

**Types**:
- `fee_assigned`: New fee structure
- `payment_submitted`: Student submits payment
- `payment_approved`: Payment approved
- `payment_rejected`: Payment rejected
- `balance_reminder`: Automated reminder

**Delivery**:
- In-app notifications (real-time polling)
- Email notifications (via campaign system)
- Push notifications (web push API)

### 4. Reporting System

**Report Types**:
- Overview dashboard (real-time)
- Collection velocity
- Installment analysis
- Departmental financial tracking
- Historical snapshots

**Export Formats**:
- PDF (statements, clearance letters)
- CSV (audit logs, reports)
- JSON (API responses)

### 5. Bank Reconciliation

**Statement Import**:
- Upload bank statement (CSV format)
- Auto-map columns (reference, amount, date)
- Match against student payments
- Identify exceptions (unmatched transactions)

**Exception Handling**:
- Unmatched bank credits
- Duplicate payments
- Amount mismatches
- Manual resolution workflow

---

## Environment Configuration

### Backend (.env)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/edupaytrack"
JWT_SECRET="your-secret-key"
GROQ_API_KEY="gsk_..."
PORT=5000
UPLOAD_DIR="uploads"
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Deployment Notes

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Python 3.8+ (for OCR fallback)
- EasyOCR Python package

### Python OCR Setup
```bash
cd backend
pip install easyocr
python -c "import easyocr; easyocr.Reader(['en'])"  # Download models
```

### Database Migration
```bash
cd backend
npx prisma migrate deploy
```

---

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint with Airbnb configuration
- Prettier for formatting
- Conventional commit messages

### Testing Strategy
- Unit tests for services
- Integration tests for API routes
- E2E tests for critical workflows
- OCR accuracy testing with sample receipts

### Security Checklist
- [ ] JWT secret rotated regularly
- [ ] File upload size limits (5MB)
- [ ] File type validation (images only)
- [ ] SQL injection prevention (Prisma)
- [XSS protection (React auto-escaping)
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging enabled

---

## Troubleshooting

### Common Issues

**OCR Not Working**:
- Check `GROQ_API_KEY` is set
- Verify Python EasyOCR is installed
- Check file format (JPG/PNG/WebP)
- Review logs in `backend/logs/`

**Database Connection**:
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Ensure database exists

**File Uploads**:
- Check `uploads/` directory exists and is writable
- Verify file size < 5MB
- Check disk space

---

## License & Attribution

This system is proprietary software developed for educational institutions. The OCR implementation uses Groq's Llama-4 model and EasyOCR open-source library.

---

*Documentation Version: 1.0*
*Last Updated: April 2026*

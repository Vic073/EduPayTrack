import PDFDocument from 'pdfkit';

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { recalculateStudentBalance } from '../utils/balance';

type StudentDocumentPayload = {
    registry: {
        institutionName: string;
        institutionType: string;
        address?: string | null;
        contactEmail?: string | null;
    };
    student: {
        id: string;
        studentCode: string;
        firstName: string;
        lastName: string;
        program: string;
        classLevel?: string | null;
        academicYear?: string | null;
        term?: string | null;
        semester?: string | null;
        currentBalance: number;
        email?: string | null;
    };
    summary: {
        totalPaid: number;
        installmentCount: number;
        pendingVerifications: number;
        rejectedSubmissions: number;
        currentBalance: number;
    };
    payments: Array<{
        id: string;
        amount: number;
        method: string;
        paymentDate: Date;
        submittedAt: Date;
        status: string;
        receiptNumber?: string | null;
        externalReference?: string | null;
    }>;
};

const formatCurrency = (amount: number) => `MWK ${amount.toLocaleString()}`;

const formatDate = (value: Date) =>
    new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(value);

const buildPdfBuffer = (draw: (doc: PDFKit.PDFDocument) => void) =>
    new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Producer: 'EduPayTrack',
            },
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        draw(doc);
        doc.end();
    });

const drawDocumentHeader = (
    doc: PDFKit.PDFDocument,
    payload: StudentDocumentPayload,
    title: string,
    subtitle: string
) => {
    doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text(payload.registry.institutionName || 'EduPayTrack');
    doc.moveDown(0.2);
    doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text(payload.registry.institutionType || 'Institution');

    if (payload.registry.address) {
        doc.text(payload.registry.address);
    }

    if (payload.registry.contactEmail) {
        doc.text(payload.registry.contactEmail);
    }

    doc.moveDown(1);
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(title);
    doc.moveDown(0.2);
    doc.fillColor('#475569').fontSize(11).font('Helvetica').text(subtitle);
    doc.moveDown(1);
};

const drawMetaGrid = (doc: PDFKit.PDFDocument, rows: Array<[string, string]>) => {
    const startX = doc.x;
    const startY = doc.y;
    const columnWidth = 240;
    const rowHeight = 40;

    rows.forEach(([label, value], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = startX + column * (columnWidth + 12);
        const y = startY + row * rowHeight;

        doc
            .roundedRect(x, y, columnWidth, 32, 6)
            .fillAndStroke('#F8FAFC', '#E2E8F0');

        doc
            .fillColor('#64748B')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(label.toUpperCase(), x + 10, y + 7, { width: columnWidth - 20 });

        doc
            .fillColor('#0F172A')
            .fontSize(10)
            .font('Helvetica')
            .text(value, x + 10, y + 17, { width: columnWidth - 20 });
    });

    doc.moveDown(Math.ceil(rows.length / 2) * 1.9);
};

const drawSummaryCards = (doc: PDFKit.PDFDocument, payload: StudentDocumentPayload) => {
    const cards = [
        ['Total Paid', formatCurrency(payload.summary.totalPaid)],
        ['Current Balance', formatCurrency(payload.summary.currentBalance)],
        ['Approved Payments', String(payload.summary.installmentCount)],
        ['Pending Reviews', String(payload.summary.pendingVerifications)],
    ];
    const startX = doc.x;
    const startY = doc.y;
    const cardWidth = 115;

    cards.forEach(([label, value], index) => {
        const x = startX + index * (cardWidth + 10);
        doc.roundedRect(x, startY, cardWidth, 52, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x + 10, startY + 10, { width: cardWidth - 20 });
        doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(value, x + 10, startY + 25, { width: cardWidth - 20 });
    });

    doc.moveDown(3.2);
};

const drawStatementTable = (doc: PDFKit.PDFDocument, payload: StudentDocumentPayload) => {
    doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Payment Activity');
    doc.moveDown(0.5);

    const columns = [
        { label: 'Date', width: 82 },
        { label: 'Reference', width: 145 },
        { label: 'Method', width: 110 },
        { label: 'Amount', width: 90 },
        { label: 'Status', width: 90 },
    ];

    const startX = doc.x;
    let currentY = doc.y;

    const drawHeader = () => {
        let x = startX;
        columns.forEach((column) => {
            doc.rect(x, currentY, column.width, 22).fillAndStroke('#E2E8F0', '#CBD5E1');
            doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(column.label, x + 6, currentY + 7, { width: column.width - 12 });
            x += column.width;
        });
        currentY += 22;
    };

    drawHeader();

    payload.payments.forEach((payment, index) => {
        if (currentY > 720) {
            doc.addPage();
            currentY = 60;
            drawHeader();
        }

        const rowValues = [
            formatDate(payment.paymentDate || payment.submittedAt),
            payment.receiptNumber || payment.externalReference || 'N/A',
            payment.method.replace(/_/g, ' '),
            formatCurrency(payment.amount),
            payment.status,
        ];

        let x = startX;
        rowValues.forEach((value, valueIndex) => {
            doc
                .rect(x, currentY, columns[valueIndex].width, 24)
                .fillAndStroke(index % 2 === 0 ? '#FFFFFF' : '#F8FAFC', '#E2E8F0');

            doc
                .fillColor('#0F172A')
                .fontSize(9)
                .font('Helvetica')
                .text(value, x + 6, currentY + 8, { width: columns[valueIndex].width - 12, ellipsis: true });

            x += columns[valueIndex].width;
        });

        currentY += 24;
    });

    if (payload.payments.length === 0) {
        doc
            .roundedRect(startX, currentY, 517, 42, 8)
            .fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('No payment activity recorded yet.', startX + 12, currentY + 15);
    }
};

export const getStudentDocumentPayloadByStudentId = async (studentId: string): Promise<StudentDocumentPayload> => {
    const [registry, student] = await Promise.all([
        prisma.systemRegistry.findFirst(),
        prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: true,
                payments: {
                    orderBy: [
                        { submittedAt: 'desc' },
                        { paymentDate: 'desc' },
                    ],
                },
            },
        }),
    ]);

    if (!student) {
        throw new AppError('Student not found', 404);
    }

    const updatedStudent = await recalculateStudentBalance(student.id);
    const approvedPayments = student.payments.filter((payment) => payment.status === 'APPROVED');
    const pendingPayments = student.payments.filter((payment) => payment.status === 'PENDING');
    const rejectedPayments = student.payments.filter((payment) => payment.status === 'REJECTED');

    return {
        registry: {
            institutionName: registry?.institutionName || 'EduPayTrack',
            institutionType: registry?.institutionType || 'Institution',
            address: registry?.address,
            contactEmail: registry?.contactEmail,
        },
        student: {
            id: student.id,
            studentCode: student.studentCode,
            firstName: student.firstName,
            lastName: student.lastName,
            program: student.program,
            classLevel: student.classLevel,
            academicYear: student.academicYear,
            term: student.term,
            semester: student.semester,
            currentBalance: Number(updatedStudent.currentBalance),
            email: student.user.email,
        },
        summary: {
            totalPaid: approvedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
            installmentCount: approvedPayments.length,
            pendingVerifications: pendingPayments.length,
            rejectedSubmissions: rejectedPayments.length,
            currentBalance: Number(updatedStudent.currentBalance),
        },
        payments: student.payments.map((payment) => ({
            id: payment.id,
            amount: Number(payment.amount),
            method: payment.method,
            paymentDate: payment.paymentDate,
            submittedAt: payment.submittedAt,
            status: payment.status,
            receiptNumber: payment.receiptNumber,
            externalReference: payment.externalReference,
        })),
    };
};

export const getStudentDocumentPayloadByUserId = async (userId: string) => {
    const student = await prisma.student.findFirst({
        where: { userId },
        select: { id: true },
    });

    if (!student) {
        throw new AppError('Student profile not found', 404);
    }

    return getStudentDocumentPayloadByStudentId(student.id);
};

export const generateStudentStatementPdf = async (studentId: string) => {
    const payload = await getStudentDocumentPayloadByStudentId(studentId);

    return buildPdfBuffer((doc) => {
        drawDocumentHeader(
            doc,
            payload,
            'Student Fee Statement',
            `Generated on ${formatDate(new Date())} for ${payload.student.firstName} ${payload.student.lastName}.`
        );

        drawMetaGrid(doc, [
            ['Student Name', `${payload.student.firstName} ${payload.student.lastName}`],
            ['Student ID', payload.student.studentCode],
            ['Program', payload.student.program || 'N/A'],
            ['Academic Year', payload.student.academicYear || payload.student.classLevel || 'N/A'],
            ['Email', payload.student.email || 'N/A'],
            ['Term / Semester', payload.student.term || payload.student.semester || 'N/A'],
        ]);

        drawSummaryCards(doc, payload);
        drawStatementTable(doc, payload);
    });
};

export const generateStudentClearanceLetterPdf = async (studentId: string) => {
    const payload = await getStudentDocumentPayloadByStudentId(studentId);

    if (payload.summary.currentBalance > 0) {
        throw new AppError('Clearance letter is only available for fully paid students', 409);
    }

    return buildPdfBuffer((doc) => {
        drawDocumentHeader(
            doc,
            payload,
            'Fee Clearance Letter',
            `Official confirmation of fee clearance issued on ${formatDate(new Date())}.`
        );

        doc
            .fillColor('#0F172A')
            .fontSize(12)
            .font('Helvetica')
            .text(
                `This letter confirms that ${payload.student.firstName} ${payload.student.lastName} (${payload.student.studentCode}) has fully settled the required school fees and is financially cleared.`,
                { lineGap: 5 }
            );

        doc.moveDown(1.2);

        drawMetaGrid(doc, [
            ['Student Name', `${payload.student.firstName} ${payload.student.lastName}`],
            ['Student ID', payload.student.studentCode],
            ['Program', payload.student.program || 'N/A'],
            ['Academic Year', payload.student.academicYear || payload.student.classLevel || 'N/A'],
            ['Total Paid', formatCurrency(payload.summary.totalPaid)],
            ['Outstanding Balance', formatCurrency(payload.summary.currentBalance)],
        ]);

        doc
            .roundedRect(doc.x, doc.y, 517, 92, 10)
            .fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#0F172A')
            .fontSize(11)
            .font('Helvetica')
            .text(
                'The student is cleared for administrative and academic processes that require confirmation of fee settlement. This document was generated from EduPayTrack records.',
                doc.x + 14,
                doc.y + 18,
                { width: 489, lineGap: 4 }
            );

        doc.moveDown(6);
        doc.fillColor('#475569').fontSize(10).text('Generated electronically by EduPayTrack');
    });
};

export const getStudentDocumentFilename = (base: string, payload: { firstName: string; lastName: string; studentCode: string }) =>
    `${base}-${payload.studentCode}-${payload.firstName.toLowerCase()}-${payload.lastName.toLowerCase()}.pdf`;

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';

export interface StatementData {
  student: {
    id: string;
    name: string;
    studentCode: string;
    program: string;
    academicYear?: string;
    email?: string;
    phone?: string;
  };
  schoolName?: string;
  summary: {
    totalPaid: number;
    currentBalance: number;
    totalFees?: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paymentDate?: string;
    submittedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    receiptNumber?: string;
    externalReference?: string;
    notes?: string;
  }>;
  generatedAt?: string;
}

const DEFAULT_SCHOOL_NAME = 'EduPayTrack Institution';

// Get school name from localStorage or use default
function getSchoolName(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_NAME;
  return window.localStorage.getItem('edu-pay-track-school-name') || DEFAULT_SCHOOL_NAME;
}

export function generateStudentStatement(data: StatementData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Colors - using tuples for proper typing
  const primaryColor: [number, number, number] = [41, 98, 255]; // Blue
  const successColor: [number, number, number] = [34, 197, 94]; // Green
  const warningColor: [number, number, number] = [234, 179, 8]; // Yellow
  const destructiveColor: [number, number, number] = [239, 68, 68]; // Red
  const darkColor: [number, number, number] = [31, 41, 55]; // Dark gray
  const lightGray: [number, number, number] = [156, 163, 175]; // Light gray

  // Header Background
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 90, 'F');

  // School Logo placeholder / Title
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName || getSchoolName(), margin, 30);

  // Statement Title
  doc.setFontSize(28);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('STUDENT STATEMENT', margin, 55);

  // Statement Details
  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  const generatedDate = data.generatedAt ? formatDate(data.generatedAt) : formatDate(new Date().toISOString());
  doc.text(`Statement Date: ${generatedDate}`, margin, 68);
  doc.text(`Student ID: ${data.student.studentCode}`, margin, 78);

  // Status Badge - Shows if fully paid or balance due
  const isFullyPaid = data.summary.currentBalance <= 0;
  const statusColor = isFullyPaid ? successColor : warningColor;
  const statusText = isFullyPaid ? 'FULLY PAID' : 'BALANCE DUE';
  const statusX = pageWidth - margin - 55;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(statusX, 48, 55, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, statusX + 27.5, 59, { align: 'center' });

  // Horizontal Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 90, pageWidth - margin, 90);

  // Balance Section
  doc.setFontSize(12);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Current Balance', margin, 110);

  doc.setFontSize(32);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.summary.currentBalance), margin, 130);

  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Fees: ${formatCurrency(data.summary.totalFees || data.summary.totalPaid + data.summary.currentBalance)}  |  Total Paid: ${formatCurrency(data.summary.totalPaid)}`, margin, 142);

  // Information Table
  const tableData = [
    ['Full Name', data.student.name],
    ['Student ID', data.student.studentCode],
    ['Program', data.student.program || 'N/A'],
  ];
  if (data.student.academicYear) tableData.push(['Academic Year', data.student.academicYear]);
  if (data.student.email) tableData.push(['Email Address', data.student.email]);
  if (data.student.phone) tableData.push(['Phone Number', data.student.phone]);

  tableData.push(['Approved Payments', `${data.summary.approvedCount} transaction${data.summary.approvedCount !== 1 ? 's' : ''}`]);
  tableData.push(['Pending Verification', `${data.summary.pendingCount}`]);
  tableData.push(['Rejected Submissions', `${data.summary.rejectedCount}`]);

  autoTable(doc, {
    startY: 160,
    head: [['Description', 'Details']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [31, 41, 55],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [75, 85, 99],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
  });

  // Payment History Section
  const historyStartY = (doc as any).lastAutoTable?.finalY + 20 || 300;

  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment History', margin, historyStartY);

  // Sort payments by date (newest first)
  const sortedPayments = [...data.payments].sort((a, b) => {
    const dateA = new Date(a.paymentDate || a.submittedAt).getTime();
    const dateB = new Date(b.paymentDate || b.submittedAt).getTime();
    return dateB - dateA; // Newest first
  });

  // Calculate running balance (starting from total paid, going backwards)
  let runningBalance = 0;
  const paymentRows = sortedPayments.reverse().map((payment) => {
    if (payment.status === 'APPROVED') {
      runningBalance += payment.amount;
    }

    return [
      formatDate(payment.paymentDate || payment.submittedAt),
      payment.receiptNumber || payment.externalReference || payment.id.slice(-8).toUpperCase(),
      payment.method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      formatCurrency(payment.amount),
      payment.status,
      formatCurrency(runningBalance),
    ];
  }).reverse();

  if (paymentRows.length === 0) {
    paymentRows.push(['No payment records found', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: historyStartY + 8,
    head: [['Date', 'Reference', 'Method', 'Amount', 'Status', 'Running Balance']],
    body: paymentRows,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [31, 41, 55],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [75, 85, 99],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    didParseCell: function (data: any) {
      // Color code the status column
      if (data.section === 'body' && data.column.index === 4) {
        const status = data.cell.raw;
        if (status === 'APPROVED') {
          data.cell.styles.textColor = successColor;
        } else if (status === 'REJECTED') {
          data.cell.styles.textColor = destructiveColor;
        } else if (status === 'PENDING') {
          data.cell.styles.textColor = warningColor;
        }
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });


  // Notes Section (if there are any notes)
  const notesStartY = (doc as any).lastAutoTable?.finalY + 20 || 400;

  doc.setFontSize(14);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Important Notes', margin, notesStartY);

  doc.setFillColor(254, 252, 232);
  doc.roundedRect(margin, notesStartY + 5, pageWidth - (margin * 2), 50, 4, 4, 'F');

  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'normal');
  doc.text(
    '1. This statement reflects all payments received and processed by the Accounts Office.\n' +
    '2. All amounts are displayed in Malawian Kwacha (MWK).\n' +
    '3. Pending payments are subject to verification and may change upon review.\n' +
    '4. Please retain your original receipts for future reference and verification.\n' +
    '5. For any discrepancies, please contact the Accounts Office within 30 days.',
    margin + 8, notesStartY + 18, { maxWidth: pageWidth - (margin * 2) - 16 }
  );

  // Official Verification Section
  const officialY = notesStartY + 65;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, officialY, (pageWidth - margin * 2) / 2 - 5, 55, 4, 4, 'F');
  doc.setFontSize(10);
  doc.setTextColor(successColor[0], successColor[1], successColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL STAMP', margin + 10, officialY + 15);
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Accounts Office\n\nDate: _______________', margin + 10, officialY + 28);

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin + (pageWidth - margin * 2) / 2 + 5, officialY, (pageWidth - margin * 2) / 2 - 5, 55, 4, 4, 'F');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATURE', margin + (pageWidth - margin * 2) / 2 + 15, officialY + 15);
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Accounts Officer\n\nSignature: _______________', margin + (pageWidth - margin * 2) / 2 + 15, officialY + 28);

  // Footer
  const footerY = doc.internal.pageSize.height - 30;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an official fee statement generated by EduPayTrack.', margin, footerY);
  doc.text('For inquiries, please contact the accounts office.', margin, footerY + 5);

  // Generated timestamp
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

export function downloadStudentStatement(data: StatementData, filename?: string): void {
  const doc = generateStudentStatement(data);
  const safeName = data.student.name.replace(/\s+/g, '-').toLowerCase();
  const defaultFilename = `fee-statement-${data.student.studentCode}-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
}

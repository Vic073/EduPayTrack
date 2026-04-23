import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';

export interface ReceiptData {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  method: string;
  externalReference?: string;
  receiptNumber?: string;
  paymentDate?: string;
  submittedAt?: string;
  payerName?: string;
  notes?: string;
  student?: {
    name?: string;
    email?: string;
    studentId?: string;
    program?: string;
  };
  reviewedBy?: {
    name?: string;
  };
  reviewedAt?: string;
  schoolName?: string;
}

const DEFAULT_SCHOOL_NAME = 'EduPayTrack Institution';

// Get school name from localStorage or use default
function getSchoolName(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_NAME;
  return window.localStorage.getItem('edu-pay-track-school-name') || DEFAULT_SCHOOL_NAME;
}

export function generatePaymentReceipt(data: ReceiptData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  // Colors
  const primaryColor = [41, 98, 255]; // Blue
  const successColor = [34, 197, 94]; // Green
  const warningColor = [234, 179, 8]; // Yellow
  const destructiveColor = [239, 68, 68]; // Red
  const darkColor = [31, 41, 55]; // Dark gray
  const lightGray = [156, 163, 175]; // Light gray
  
  // Helper to get status color
  const getStatusColor = (status: string): number[] => {
    switch (status) {
      case 'APPROVED': return successColor;
      case 'REJECTED': return destructiveColor;
      default: return warningColor;
    }
  };
  
  // Header Background
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // School Logo placeholder / Title
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName || getSchoolName(), margin, 30);
  
  // Receipt Title
  doc.setFontSize(28);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('PAYMENT RECEIPT', margin, 55);
  
  // Receipt Number
  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${data.receiptNumber || data.externalReference || data.id}`, margin, 68);
  
  // Status Badge
  const statusColor = getStatusColor(data.status);
  const statusX = pageWidth - margin - 50;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(statusX, 48, 50, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.status, statusX + 25, 59, { align: 'center' });
  
  // Horizontal Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 90, pageWidth - margin, 90);
  
  // Amount Section
  doc.setFontSize(12);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid', margin, 110);
  
  doc.setFontSize(32);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.amount), margin, 130);
  
  // Payment Method
  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`via ${data.method?.replace(/_/g, ' ') || 'Unknown Method'}`, margin, 142);
  
  // Details Table
  const tableData = [
    ['Payment Date', formatDate(data.paymentDate || data.submittedAt)],
    ['Reference Number', data.externalReference || data.receiptNumber || 'N/A'],
    ['Transaction ID', data.id],
    ['Payer Name', data.payerName || data.student?.name || 'N/A'],
  ];
  
  if (data.student?.studentId) {
    tableData.push(['Student ID', data.student.studentId]);
  }
  
  if (data.student?.program) {
    tableData.push(['Program', data.student.program]);
  }
  
  if (data.notes) {
    tableData.push(['Notes', data.notes]);
  }
  
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
  
  // Approval Section (if approved)
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  
  if (data.status === 'APPROVED' && data.reviewedBy) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, finalY + 15, pageWidth - (margin * 2), 50, 4, 4, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ VERIFIED & APPROVED', margin + 10, finalY + 32);
    
    doc.setFontSize(10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Verified by: ${data.reviewedBy.name || 'Admin'}`, margin + 10, finalY + 45);
    doc.text(`Date: ${formatDate(data.reviewedAt)}`, margin + 10, finalY + 55);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.height - 30;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an official receipt generated by EduPayTrack.', margin, footerY);
  doc.text('For inquiries, please contact the accounts office.', margin, footerY + 5);
  
  // Generated timestamp
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });
  
  return doc;
}

export function downloadPaymentReceipt(data: ReceiptData, filename?: string): void {
  const doc = generatePaymentReceipt(data);
  const defaultFilename = `receipt-${data.receiptNumber || data.externalReference || data.id}-${formatDate(data.paymentDate || data.submittedAt).replace(/\//g, '-')}.pdf`;
  doc.save(filename || defaultFilename);
}

// Statement PDF Generation
export interface StatementData {
  student: {
    id: string;
    name: string;
    studentCode: string;
    program: string;
    academicYear?: string;
    email?: string;
  };
  schoolName?: string;
  summary: {
    totalPaid: number;
    currentBalance: number;
    installmentCount: number;
    pendingVerifications: number;
    rejectedSubmissions: number;
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
  }>;
}

export function generateStudentStatement(data: StatementData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  // Colors
  const primaryColor = [41, 98, 255]; // Blue
  const successColor = [34, 197, 94]; // Green
  const warningColor = [234, 179, 8]; // Yellow
  const destructiveColor = [239, 68, 68]; // Red
  const darkColor = [31, 41, 55]; // Dark gray
  const lightGray = [156, 163, 175]; // Light gray
  
  // Header Background
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // School Name
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName || getSchoolName(), margin, 30);
  
  // Statement Title
  doc.setFontSize(28);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('FEE STATEMENT', margin, 55);
  
  // Generation Date
  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin, 68);
  
  // Status badge showing balance status
  const isFullyPaid = data.summary.currentBalance <= 0;
  const statusColor = isFullyPaid ? successColor : warningColor;
  const statusText = isFullyPaid ? 'FULLY PAID' : 'BALANCE DUE';
  const statusX = pageWidth - margin - 60;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(statusX, 48, 60, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, statusX + 30, 59, { align: 'center' });
  
  // Horizontal Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 90, pageWidth - margin, 90);
  
  // Student Info Section
  doc.setFontSize(12);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Information', margin, 105);
  
  const studentInfo = [
    ['Name', data.student.name],
    ['Student ID', data.student.studentCode],
    ['Program', data.student.program || 'N/A'],
    ['Academic Year', data.student.academicYear || 'N/A'],
    ['Email', data.student.email || 'N/A'],
  ];
  
  autoTable(doc, {
    startY: 112,
    body: studentInfo,
    theme: 'plain',
    bodyStyles: {
      fontSize: 10,
      textColor: [75, 85, 99],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100, textColor: [31, 41, 55] },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
  });
  
  // Summary Cards
  const summaryY = (doc as any).lastAutoTable?.finalY + 15 || 180;
  
  doc.setFontSize(12);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Payment Summary', margin, summaryY);
  
  const summaryData = [
    ['Total Amount Paid', formatCurrency(data.summary.totalPaid)],
    ['Current Balance', formatCurrency(data.summary.currentBalance)],
    ['Approved Payments', `${data.summary.installmentCount} transaction${data.summary.installmentCount !== 1 ? 's' : ''}`],
    ['Pending Reviews', `${data.summary.pendingVerifications}`],
  ];
  
  autoTable(doc, {
    startY: summaryY + 7,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: [75, 85, 99],
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [31, 41, 55] },
      1: { halign: 'right', fontStyle: 'bold', textColor: [41, 98, 255] },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
  });
  
  // Payment History Table
  const tableStartY = (doc as any).lastAutoTable?.finalY + 20 || 250;
  
  doc.setFontSize(12);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Payment History', margin, tableStartY - 5);
  
  // Sort payments by date
  const sortedPayments = [...data.payments].sort((a, b) => {
    const dateA = new Date(a.paymentDate || a.submittedAt).getTime();
    const dateB = new Date(b.paymentDate || b.submittedAt).getTime();
    return dateA - dateB;
  });
  
  let runningBalance = data.summary.totalPaid;
  
  const paymentRows = sortedPayments.map((payment) => {
    if (payment.status === 'APPROVED') {
      runningBalance -= payment.amount;
    }
    
    const statusColor = payment.status === 'APPROVED' 
      ? successColor 
      : payment.status === 'REJECTED' 
        ? destructiveColor 
        : warningColor;
    
    return [
      formatDate(payment.paymentDate || payment.submittedAt),
      payment.receiptNumber || payment.externalReference || payment.id.slice(-8),
      payment.method.replace(/_/g, ' '),
      formatCurrency(payment.amount),
      { content: payment.status, styles: { textColor: statusColor, fontStyle: 'bold' } },
      payment.status === 'APPROVED' ? formatCurrency(Math.max(0, runningBalance)) : '-',
    ];
  });
  
  if (paymentRows.length === 0) {
    paymentRows.push(['No payment activity recorded yet.', '', '', '', '', '']);
  }
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Date', 'Reference', 'Method', 'Amount', 'Status', 'Balance']],
    body: paymentRows,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
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
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });
  
  // Terms & Conditions
  const finalY = (doc as any).lastAutoTable?.finalY + 20 || 350;
  
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 50, 4, 4, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', margin + 10, finalY + 15);
  
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(
    '1. This statement reflects payments received and processed by the Accounts Office.\n' +
    '2. All amounts are in Malawian Kwacha (MWK).\n' +
    '3. Pending payments are subject to verification.\n' +
    '4. Please retain your original receipts for reference.',
    margin + 10, finalY + 25
  );
  
  // Official Section
  const officialY = finalY + 60;
  
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, officialY, (pageWidth - margin * 2) / 2 - 5, 45, 4, 4, 'F');
  doc.setFontSize(9);
  doc.setTextColor(successColor[0], successColor[1], successColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL STAMP', margin + 10, officialY + 15);
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Accounts Office\nDate: ____________', margin + 10, officialY + 25);
  
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(margin + (pageWidth - margin * 2) / 2 + 5, officialY, (pageWidth - margin * 2) / 2 - 5, 45, 4, 4, 'F');
  doc.setFontSize(9);
  doc.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATURE', margin + (pageWidth - margin * 2) / 2 + 15, officialY + 15);
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Accounts Officer\nSignature: ____________', margin + (pageWidth - margin * 2) / 2 + 15, officialY + 25);
  
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
  
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });
  
  return doc;
}

export function downloadStudentStatement(data: StatementData, filename?: string): void {
  const doc = generateStudentStatement(data);
  const defaultFilename = `statement-${data.student.studentCode}-${data.student.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
}

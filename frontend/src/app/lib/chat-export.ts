import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ChatMessage {
  id: string;
  senderId: string;
  content?: string;
  createdAt: string | Date;
  attachmentName?: string;
  attachment?: {
    name?: string;
  };
}

export function exportChatToPdf(
  messages: ChatMessage[],
  currentUserId: string,
  currentUserName: string,
  otherUserName: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Header Background
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Header
  doc.setFontSize(22);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Conversation Transcript', margin, 25);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Participants: ${currentUserName} & ${otherUserName}`, margin, 35);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, 42);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);

  // Messages table
  const tableData = messages.map(msg => {
    const isMe = msg.senderId === currentUserId;
    const sender = isMe ? 'You' : otherUserName;
    const time = new Date(msg.createdAt).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let text = msg.content || '';
    const attName = msg.attachmentName || msg.attachment?.name;
    if (attName) {
      text += (text ? '\n\n' : '') + `[📎 Attachment: ${attName}]`;
    }

    return [
      sender,
      text,
      time
    ];
  });

  if (tableData.length === 0) {
    tableData.push(['', 'No messages in this conversation.', '']);
  }

  autoTable(doc, {
    startY: 60,
    head: [['Sender', 'Message', 'Time']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [31, 41, 55],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 0) {
        // Highlight current user
        if (data.cell.raw === 'You') {
          data.cell.styles.textColor = [41, 98, 255]; // Primary blue
        }
      }
    }
  });

  const safeName = otherUserName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`transcript-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

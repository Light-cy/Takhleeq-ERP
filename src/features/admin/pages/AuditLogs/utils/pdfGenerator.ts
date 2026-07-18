import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditRecord } from '../../../../../types';
import { formatAuditValue } from '../../../utils/auditFormatter';

export function exportAuditLogsPDF(filteredLogs: AuditRecord[], searchQuery: string) {
  try {
    const doc = new jsPDF();
    
    doc.setProperties({
      title: 'Takhleeq ERP - Compliance Audit Report',
      subject: 'Immutable Audit Ledger Logs',
      author: 'Takhleeq ERP Administration',
      creator: 'Takhleeq ERP Securitized Engine'
    });

    // Header Brand bar
    doc.setFillColor(17, 24, 39); // Deep space slate grey (#111827)
    doc.rect(0, 0, 210, 36, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('TAKHLLEQ ERP', 10, 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('SECURED COMPLIANCE AUDIT REPORT', 10, 25);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

    // Section metadata
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Ledger Compliance Parameters', 10, 48);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(`Total Query Matches: ${filteredLogs.length} entries`, 10, 54);
    doc.text('Action Filter Applied: All Event Types', 10, 59);
    doc.text(`Search Keyword filter: ${searchQuery ? `"${searchQuery}"` : 'None'}`, 10, 64);
    
    // AutoTable setup
    const tableHead = [['Timestamp (UTC)', 'System Event Action', 'Authorizer User', 'Previous Value', 'New Value / Action']];
    const tableBody = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.action,
      log.user,
      formatAuditValue(log.previousValue, log.newValue),
      formatAuditValue(log.newValue, log.previousValue)
    ]);

    autoTable(doc, {
      startY: 70,
      margin: { left: 10, right: 10 },
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [55, 65, 81]
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 38 },
        2: { cellWidth: 32 },
        3: { cellWidth: 46 },
        4: { cellWidth: 46 }
      },
      didDrawPage: (data) => {
        // Add system timestamp tracking and footer signatures on each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} | SHA-256 Block-Secured System Audit Trail`,
          10,
          285
        );
      }
    });

    const filename = `takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Failed to export PDF:', error);
  }
}

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '@/lib/reportUtils';

export class PDFReport {
  static async generate(dateRange: { from: Date; to: Date }) {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Financial Report', 105, 15, { align: 'center' });

    // Add date range
    doc.setFontSize(12);
    doc.text(
      `Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
      105,
      25,
      { align: 'center' }
    );

    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 40);

    const summaryData = [
      ['Total Income', formatCurrency(45000)],
      ['Total Expenses', formatCurrency(32000)],
      ['Net Balance', formatCurrency(13000)],
    ];

    (doc as any).autoTable({
      startY: 45,
      head: [['Category', 'Amount']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Add transactions section
    doc.setFontSize(14);
    doc.text('Transaction Details', 14, 100);

    const transactionData = [
      ['2024-02-01', 'Monthly Rent', '-$3,750.00', 'Expense'],
      ['2024-02-01', 'Salary', '$4,739.00', 'Income'],
    ];

    (doc as any).autoTable({
      startY: 105,
      head: [['Date', 'Description', 'Amount', 'Type']],
      body: transactionData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Save the PDF
    doc.save('financial-report.pdf');
  }
}

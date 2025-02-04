import { utils, write as writeXLSX } from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

export const exportToExcel = (data: Transaction[], filename = 'budget-export') => {
  const worksheet = utils.json_to_sheet(data.map(item => ({
    Date: dayjs(item.date).format('YYYY-MM-DD'),
    Type: item.type,
    Category: item.category,
    Description: item.description,
    Amount: item.amount,
  })));

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Budget Data');

  // Generate array buffer
  const wbout = writeXLSX(workbook, { bookType: 'xlsx', type: 'array' });

  // Convert to Blob and save
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data: Transaction[], filename = 'budget-export') => {
  // Convert data to CSV format manually
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const rows = data.map(item => [
    dayjs(item.date).format('YYYY-MM-DD'),
    item.type,
    item.category,
    item.description,
    item.amount.toString()
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToPDF = async (data: Transaction[], filename = 'budget-export') => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text('Budget Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 22);

  // Prepare data for the table
  const tableData = data.map(item => [
    dayjs(item.date).format('YYYY-MM-DD'),
    item.type,
    item.category,
    item.description,
    item.amount.toFixed(2)
  ]);

  // Add table
  autoTable(doc, {
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: tableData,
    startY: 25,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] }
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
};

export const exportData = (data: Transaction[], format: 'excel' | 'csv' | 'pdf', filename?: string) => {
  const exportFunctions = {
    excel: exportToExcel,
    csv: exportToCSV,
    pdf: exportToPDF
  };

  if (!filename) {
    filename = `budget-export-${dayjs().format('YYYY-MM-DD')}`;
  }

  exportFunctions[format](data, filename);
};
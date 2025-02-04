import { utils, write as writeXLSX } from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

const calculateBiweeklyOccurrences = (income: any, startDate: Date, endDate: Date) => {
  // Only process Ruba's salary
  if (income.source !== "Ruba's Salary") {
    return [{
      ...income,
      date: income.date
    }];
  }

  const occurrences = [];
  const rubaStart = dayjs('2025-01-10'); // Ruba's salary reference start date
  let currentDate = rubaStart.clone();
  const rangeEnd = dayjs(endDate);

  while (currentDate.isBefore(rangeEnd) || currentDate.isSame(rangeEnd, 'day')) {
    if (currentDate.day() === 5) { // Friday
      const weeksDiff = currentDate.diff(rubaStart, 'week');
      if (weeksDiff >= 0 && weeksDiff % 2 === 0) {
        // Only include if it's within the selected date range
        if (currentDate.isAfter(dayjs(startDate)) || currentDate.isSame(dayjs(startDate), 'day')) {
          occurrences.push({
            id: `${income.id}-${currentDate.format('YYYY-MM-DD')}`,
            amount: income.amount,
            description: income.source,
            category: 'Income',
            date: currentDate.toISOString(),
            type: 'income' as const
          });
        }
      }
    }
    currentDate = currentDate.add(1, 'day');
  }

  return occurrences;
};

const generateBillOccurrences = (bill: any, startDate: Date, endDate: Date) => {
  const occurrences = [];
  let currentDate = dayjs(startDate).startOf('month');
  const rangeEnd = dayjs(endDate).endOf('month');

  while (currentDate.isBefore(rangeEnd) || currentDate.isSame(rangeEnd, 'month')) {
    // Create bill occurrence for this month
    const billDate = currentDate.date(bill.day);

    // Only include if the bill date falls within our range
    if ((billDate.isAfter(dayjs(startDate)) || billDate.isSame(dayjs(startDate), 'day')) &&
        (billDate.isBefore(dayjs(endDate)) || billDate.isSame(dayjs(endDate), 'day'))) {
      occurrences.push({
        id: `${bill.id}-${billDate.format('YYYY-MM')}`,
        amount: bill.amount,
        description: bill.name,
        category: 'Expense',
        date: billDate.toISOString(),
        type: 'expense' as const
      });
    }

    currentDate = currentDate.add(1, 'month');
  }

  return occurrences;
};

export const exportToExcel = (data: Transaction[], filename = 'budget-export') => {
  const worksheet = utils.json_to_sheet(data.map(item => ({
    Date: dayjs(item.date).format('YYYY-MM-DD'),
    Type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    Category: item.category,
    Description: item.description,
    Amount: item.amount,
  })));

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Budget Data');

  const wbout = writeXLSX(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data: Transaction[], filename = 'budget-export') => {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const rows = data.map(item => [
    dayjs(item.date).format('YYYY-MM-DD'),
    item.type.charAt(0).toUpperCase() + item.type.slice(1),
    item.category,
    item.description,
    item.amount.toString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToPDF = async (data: Transaction[], filename = 'budget-export') => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Budget Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 22);

  const tableData = data.map(item => [
    dayjs(item.date).format('YYYY-MM-DD'),
    item.type.charAt(0).toUpperCase() + item.type.slice(1),
    item.category,
    item.description,
    item.amount.toFixed(2)
  ]);

  autoTable(doc, {
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: tableData,
    startY: 25,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] }
  });

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

  const processedData = data
    .flatMap(transaction => {
      if (transaction.type === 'income' && transaction.description === "Ruba's Salary") {
        return calculateBiweeklyOccurrences(
          {
            id: transaction.id,
            source: transaction.description,
            amount: transaction.amount,
            date: transaction.date
          },
          dayjs(transaction.date).toDate(),
          dayjs(transaction.date).add(6, 'month').toDate()
        );
      } else if (transaction.type === 'expense') {
        return generateBillOccurrences(transaction, dayjs(transaction.date).toDate(), dayjs(transaction.date).add(6, 'month').toDate())
      }
      return transaction;
    })
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  exportFunctions[format](processedData, filename);
};
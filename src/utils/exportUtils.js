import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";
/**
 * Prepare data based on columns config
 */
const prepareExportData = (columns, data) => {
  const exportColumns = columns.filter((col) => col.key !== "actions");

  const headers = exportColumns.map((col) => col.label);

  const rows = data.map((row) =>
    exportColumns.map((col) => {
      if (col.render) {
        return col.render(row[col.key], row);
      }
      return row[col.key] ?? "";
    }),
  );

  return { headers, rows };
};

/**
 * Export Excel
 */
export const exportToExcel = (columns, data, fileName = "export") => {
  const { headers, rows } = prepareExportData(columns, data);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${fileName}.xlsx`);
};

/**
 * Export PDF
 */

export const exportToPDF = (columns, data, fileName = "export") => {
  const exportColumns = columns.filter((col) => col.key !== "actions");

  const headers = exportColumns.map((col) => col.label);

  const rows = data.map((row) =>
    exportColumns.map((col) => {
      const value = row[col.key];

      // If render exists → use raw value instead of JSX
      if (col.render && typeof value !== "object") {
        return col.render(value, row);
      }

      return value ?? "";
    }),
  );

  const doc = new jsPDF({
    orientation: "landscape",
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    styles: {
      fontSize: 7,
    },
    theme: "grid",
  });

  doc.save(`${fileName}.pdf`);
};

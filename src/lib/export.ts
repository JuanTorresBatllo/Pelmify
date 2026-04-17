import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TimeEntry } from "@/types";
import { formatMinutesAsHours, formatTime, toDate } from "./utils";

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEntriesToCSV(entries: TimeEntry[], filenameBase = "timesheet") {
  const rows = entries.map((e) => ({
    Date: e.date,
    Employee: e.userName,
    "Clock in": formatTime(toDate(e.clockIn)),
    "Clock out": formatTime(toDate(e.clockOut)),
    Breaks: (e.breaks || []).length,
    "Total hours": formatMinutesAsHours(e.totalMinutes),
    "Total minutes": Math.round(e.totalMinutes),
  }));
  const csv = Papa.unparse(rows);
  downloadBlob(csv, `${filenameBase}.csv`, "text/csv;charset=utf-8");
}

export function exportEntriesToPDF(entries: TimeEntry[], title = "Timesheet") {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

  const totalMin = entries.reduce((s, e) => s + e.totalMinutes, 0);

  autoTable(doc, {
    startY: 32,
    head: [["Date", "Employee", "In", "Out", "Breaks", "Total"]],
    body: entries.map((e) => [
      e.date,
      e.userName,
      formatTime(toDate(e.clockIn)),
      formatTime(toDate(e.clockOut)),
      String((e.breaks || []).length),
      formatMinutesAsHours(e.totalMinutes),
    ]),
    foot: [["", "", "", "", "Total:", formatMinutesAsHours(totalMin)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 124, 255] },
    footStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
  });

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

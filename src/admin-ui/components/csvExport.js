function toCellString(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsvCell(value) {
  const text = toCellString(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function collectColumns(rows) {
  const keys = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    Object.keys(row || {}).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

export function downloadCsv(filename, rows, columns) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const header = Array.isArray(columns) && columns.length ? columns : collectColumns(normalizedRows);
  const lines = [
    header.map((column) => escapeCsvCell(column)).join(","),
    ...normalizedRows.map((row) => header.map((column) => escapeCsvCell(row?.[column])).join(","))
  ];
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

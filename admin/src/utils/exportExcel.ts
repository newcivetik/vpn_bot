import * as XLSX from 'xlsx';

interface Column {
  key: string;
  header: string;
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: Column[],
  filename: string,
) {
  const rows = data.map((item) => {
    const row: Record<string, any> = {};
    for (const col of columns) {
      let val = item[col.key];
      // Sanitize against formula injection
      if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
        val = `'${val}`;
      }
      row[col.header] = val ?? '';
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

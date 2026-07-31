import { strToU8, zipSync } from "fflate";

type ExcelTrade = {
  date: string;
  pair: string;
  side: "buy" | "sell";
  result: "win" | "loss" | "breakeven";
  pnl: number;
  rr: string;
  strategy: string;
  note: string;
};

type ExcelJournalData = {
  trades: ExcelTrade[];
  capital: Record<string, number>;
};

type CellValue = string | number;

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function worksheetXml(rows: CellValue[][], widths: number[], moneyColumn?: number) {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      const style = rowIndex === 0 ? 1 : moneyColumn === columnIndex ? 2 : 0;
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
      }
      return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const lastCell = `${columnName(Math.max(0, widths.length - 1))}${Math.max(1, rows.length)}`;
  return `${xmlHeader}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCell}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columns}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${columnName(Math.max(0, widths.length - 1))}1"/></worksheet>`;
}

export function createTradingJournalWorkbook(data: ExcelJournalData) {
  const tradeRows: CellValue[][] = [
    ["วันที่", "คู่เงิน / สินทรัพย์", "ประเภท", "ผลลัพธ์", "กำไร / ขาดทุน ($)", "RR Ratio", "กลยุทธ์ / เซตอัป", "บันทึกเพิ่มเติม"],
    ...data.trades
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((trade) => [
        trade.date,
        trade.pair,
        trade.side === "buy" ? "Buy" : "Sell",
        trade.result === "win" ? "Win" : trade.result === "loss" ? "Loss" : "Breakeven",
        trade.pnl,
        trade.rr,
        trade.strategy,
        trade.note,
      ]),
  ];
  const capitalRows: CellValue[][] = [
    ["เดือน", "ทุนเริ่มต้น ($)"],
    ...Object.entries(data.capital)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => [month, Number(amount) || 0]),
  ];

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`${xmlHeader}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="รายการเทรด" sheetId="1" r:id="rId1"/><sheet name="ทุนรายเดือน" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`${xmlHeader}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="$#,##0.00;[Red]-$#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF101A2F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(tradeRows, [14, 20, 11, 13, 20, 12, 28, 42], 4)),
    "xl/worksheets/sheet2.xml": strToU8(worksheetXml(capitalRows, [16, 20], 1)),
  };

  return zipSync(files, { level: 6 });
}

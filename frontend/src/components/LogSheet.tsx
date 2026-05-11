import type { DailyLog, LogEntry } from '../types';

const SVG_WIDTH = 960;
const SVG_HEIGHT = 620;
const GRID_LEFT = 140;
const GRID_RIGHT = 870;
const GRID_WIDTH = GRID_RIGHT - GRID_LEFT;
const PX_PER_HOUR = GRID_WIDTH / 24;
const INFO_Y = 55;
const GRID_TOP = 120;
const ROW_HEIGHT = 40;
const TOTAL_COL_X = GRID_RIGHT + 10;
const REMARKS_Y = GRID_TOP + ROW_HEIGHT * 4 + 30;
const RECAP_Y = 480;

const STATUS_ROWS: { key: string; label: string; color: string }[] = [
  { key: 'off_duty', label: '1. Off Duty', color: '#4CAF50' },
  { key: 'sleeper_berth', label: '2. Sleeper Berth', color: '#9C27B0' },
  { key: 'driving', label: '3. Driving', color: '#2196F3' },
  { key: 'on_duty_not_driving', label: '4. On Duty', color: '#FF9800' },
];

const STATUS_ROW_INDEX: Record<string, number> = {
  off_duty: 0, sleeper_berth: 1, driving: 2, on_duty_not_driving: 3,
};

interface Props { log: DailyLog; }

export default function LogSheet({ log }: Props) {
  const hourToX = (hour: number) => GRID_LEFT + hour * PX_PER_HOUR;
  const rowToY = (rowIndex: number) => GRID_TOP + rowIndex * ROW_HEIGHT;

  const transitions: { x: number; y1: number; y2: number }[] = [];
  for (let i = 1; i < log.entries.length; i++) {
    const prev = log.entries[i - 1];
    const curr = log.entries[i];
    if (prev.status !== curr.status) {
      const x = hourToX(curr.start_hour);
      const prevRow = STATUS_ROW_INDEX[prev.status];
      const currRow = STATUS_ROW_INDEX[curr.status];
      const y1 = rowToY(Math.min(prevRow, currRow));
      const y2 = rowToY(Math.max(prevRow, currRow)) + ROW_HEIGHT;
      transitions.push({ x, y1, y2 });
    }
  }

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: SVG_WIDTH, background: 'white', border: '1px solid #ccc' }}>
      <text x={20} y={25} fontSize={16} fontWeight="bold" fontFamily="DM Sans, sans-serif">DRIVER'S DAILY LOG</text>
      <text x={20} y={42} fontSize={10} fill="#666">(24 hours)</text>
      <text x={250} y={25} fontSize={13} fontWeight="bold">Date: {log.date}</text>
      <text x={500} y={20} fontSize={9} fill="#666">Original — File at home terminal</text>
      <text x={500} y={32} fontSize={9} fill="#666">Duplicate — Driver retains for 8 days</text>

      <text x={20} y={INFO_Y + 15} fontSize={11}>From: {log.from_city}</text>
      <text x={300} y={INFO_Y + 15} fontSize={11}>To: {log.to_city}</text>
      <text x={550} y={INFO_Y + 15} fontSize={11}>Miles Driving Today: {log.total_miles_today}</text>
      <line x1={20} y1={INFO_Y + 25} x2={SVG_WIDTH - 20} y2={INFO_Y + 25} stroke="#ccc" />

      <text x={20} y={INFO_Y + 40} fontSize={9} fill="#999">Carrier: ________________</text>
      <text x={250} y={INFO_Y + 40} fontSize={9} fill="#999">Truck/Tractor #: ________</text>
      <text x={500} y={INFO_Y + 40} fontSize={9} fill="#999">Home Terminal: ________________</text>

      <text x={GRID_LEFT} y={GRID_TOP - 6} fontSize={7} textAnchor="middle">Midnight</text>
      {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
        <text key={h} x={hourToX(h)} y={GRID_TOP - 6} fontSize={8} textAnchor="middle">
          {h === 12 ? 'Noon' : h > 12 ? h - 12 : h}
        </text>
      ))}
      <text x={GRID_RIGHT} y={GRID_TOP - 6} fontSize={7} textAnchor="middle">Midnight</text>
      <text x={TOTAL_COL_X + 20} y={GRID_TOP - 6} fontSize={8} textAnchor="middle" fontWeight="bold">Total</text>
      <text x={TOTAL_COL_X + 20} y={GRID_TOP + 4} fontSize={8} textAnchor="middle" fontWeight="bold">Hours</text>

      {STATUS_ROWS.map((row, idx) => (
        <g key={row.key}>
          <text x={15} y={rowToY(idx) + ROW_HEIGHT / 2 + (idx === 3 ? -2 : 4)} fontSize={10} fontWeight="600">
            {row.label}
          </text>
          {idx === 3 && (
            <text x={15} y={rowToY(idx) + ROW_HEIGHT / 2 + 10} fontSize={8} fill="#666">
              (not driving)
            </text>
          )}
        </g>
      ))}

      {STATUS_ROWS.map((_, idx) => (
        <rect key={idx} x={GRID_LEFT} y={rowToY(idx)} width={GRID_WIDTH} height={ROW_HEIGHT} fill="none" stroke="#333" strokeWidth={1} />
      ))}

      {Array.from({ length: 25 }, (_, h) => (
        <line key={`major-${h}`} x1={hourToX(h)} y1={GRID_TOP} x2={hourToX(h)} y2={GRID_TOP + ROW_HEIGHT * 4}
          stroke="#333" strokeWidth={h === 0 || h === 24 ? 1.5 : 0.5} />
      ))}

      {Array.from({ length: 96 }, (_, i) => {
        const hour = i * 0.25;
        if (hour % 1 === 0) return null;
        return (
          <line key={`minor-${i}`} x1={hourToX(hour)} y1={GRID_TOP} x2={hourToX(hour)} y2={GRID_TOP + ROW_HEIGHT * 4}
            stroke="#ddd" strokeWidth={0.3} strokeDasharray={hour % 0.5 === 0 ? 'none' : '2,2'} />
        );
      })}

      {Array.from({ length: 5 }, (_, i) => (
        <line key={`hsep-${i}`} x1={GRID_LEFT} y1={GRID_TOP + i * ROW_HEIGHT} x2={GRID_RIGHT} y2={GRID_TOP + i * ROW_HEIGHT}
          stroke="#333" strokeWidth={i === 0 || i === 4 ? 1.5 : 0.5} />
      ))}

      {log.entries.map((entry: LogEntry, i: number) => {
        const rowIdx = STATUS_ROW_INDEX[entry.status];
        if (rowIdx === undefined) return null;
        const x = hourToX(entry.start_hour);
        const w = (entry.end_hour - entry.start_hour) * PX_PER_HOUR;
        return (
          <rect key={i} x={x} y={rowToY(rowIdx) + 2} width={Math.max(w, 0.5)} height={ROW_HEIGHT - 4}
            fill={STATUS_ROWS[rowIdx].color} opacity={0.7} rx={1} />
        );
      })}

      {transitions.map((t, i) => (
        <line key={`trans-${i}`} x1={t.x} y1={t.y1} x2={t.x} y2={t.y2} stroke="#000" strokeWidth={2} />
      ))}

      {STATUS_ROWS.map((row, idx) => (
        <text key={`total-${row.key}`} x={TOTAL_COL_X + 20} y={rowToY(idx) + ROW_HEIGHT / 2 + 4}
          fontSize={11} textAnchor="middle" fontWeight="bold">
          {(log.totals[row.key as keyof typeof log.totals] || 0).toFixed(1)}
        </text>
      ))}

      <text x={TOTAL_COL_X + 20} y={GRID_TOP + ROW_HEIGHT * 4 + 15} fontSize={11} textAnchor="middle" fontWeight="bold">
        Total: {Object.values(log.totals).reduce((a, b) => a + b, 0).toFixed(1)}
      </text>

      <line x1={20} y1={REMARKS_Y - 10} x2={SVG_WIDTH - 20} y2={REMARKS_Y - 10} stroke="#ccc" />
      <text x={20} y={REMARKS_Y + 5} fontSize={12} fontWeight="bold">REMARKS</text>
      {log.remarks.slice(0, 6).map((remark, i) => (
        <text key={i} x={30} y={REMARKS_Y + 22 + i * 14} fontSize={9}>{remark}</text>
      ))}

      <line x1={20} y1={RECAP_Y - 30} x2={SVG_WIDTH - 20} y2={RECAP_Y - 30} stroke="#ccc" />
      <text x={20} y={RECAP_Y - 15} fontSize={10} fontWeight="bold">SHIPPING DOCUMENTS</text>
      <text x={30} y={RECAP_Y} fontSize={9} fill="#999">DVL or Manifest No: ________________  Shipper & Commodity: ________________</text>

      <line x1={20} y1={RECAP_Y + 15} x2={SVG_WIDTH - 20} y2={RECAP_Y + 15} stroke="#ccc" />
      <text x={20} y={RECAP_Y + 32} fontSize={11} fontWeight="bold">RECAP: 70 Hour / 8 Day</text>

      <rect x={30} y={RECAP_Y + 40} width={250} height={70} fill="none" stroke="#333" />
      <line x1={110} y1={RECAP_Y + 40} x2={110} y2={RECAP_Y + 110} stroke="#333" />
      <line x1={190} y1={RECAP_Y + 40} x2={190} y2={RECAP_Y + 110} stroke="#333" />
      <line x1={30} y1={RECAP_Y + 55} x2={280} y2={RECAP_Y + 55} stroke="#333" />

      <text x={70} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">A.</text>
      <text x={150} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">B.</text>
      <text x={235} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">C.</text>

      <text x={70} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs on duty</text>
      <text x={70} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">last 7 days</text>
      <text x={70} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">incl. today</text>
      <text x={150} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs</text>
      <text x={150} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">available</text>
      <text x={150} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">tomorrow</text>
      <text x={235} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs on duty</text>
      <text x={235} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">last 3 days</text>
      <text x={235} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">incl. today</text>

      <text x={70} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">{log.recap_70hr.a_total_on_duty_7_days}</text>
      <text x={150} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">{log.recap_70hr.b_hours_available_tomorrow}</text>
      <text x={235} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">{log.recap_70hr.c_total_on_duty_3_days}</text>

      <text x={300} y={RECAP_Y + 60} fontSize={8} fill="#666">* If you took 34 consecutive hours off duty</text>
      <text x={300} y={RECAP_Y + 72} fontSize={8} fill="#666">you have 60/70 hours available</text>

      <text x={20} y={SVG_HEIGHT - 10} fontSize={8} fill="#999">Use time standard of home terminal. Day {log.day_number}</text>
    </svg>
  );
}

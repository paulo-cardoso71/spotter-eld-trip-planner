import { useCallback, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { DailyLog } from '../types';
import LogSheet from './LogSheet';

interface Props { logs: DailyLog[]; }

export default function LogSheetList({ logs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const { svg2pdf } = await import('svg2pdf.js');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const svgs = containerRef.current?.querySelectorAll('svg');
    if (!svgs) return;
    for (let i = 0; i < svgs.length; i++) {
      if (i > 0) pdf.addPage();
      await svg2pdf(svgs[i], pdf, { x: 20, y: 20, width: 752, height: 500 });
    }
    pdf.save('eld-daily-logs.pdf');
  }, []);

  if (!logs.length) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Daily Log Sheets</Typography>
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf}>Export PDF</Button>
      </Box>
      <div ref={containerRef}>
        {logs.map((log) => (
          <Paper key={log.date} sx={{ mb: 3, p: 2, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">Day {log.day_number} — {log.date}</Typography>
            <LogSheet log={log} />
          </Paper>
        ))}
      </div>
    </Box>
  );
}

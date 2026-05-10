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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 4, height: 24, bgcolor: '#ff6d00', borderRadius: 1 }} />
          Daily Log Sheets
        </Typography>
        <Button
          variant="contained" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf}
          sx={{
            bgcolor: '#1a237e', borderRadius: 2, fontWeight: 600,
            '&:hover': { bgcolor: '#000051' },
          }}
        >
          Export PDF
        </Button>
      </Box>
      <div ref={containerRef}>
        {logs.map((log) => (
          <Paper key={log.date} sx={{
            mb: 3, p: 2.5, overflow: 'auto', borderRadius: 3,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#1a237e', fontWeight: 700 }}>
              Day {log.day_number} — {log.date}
            </Typography>
            <LogSheet log={log} />
          </Paper>
        ))}
      </div>
    </Box>
  );
}

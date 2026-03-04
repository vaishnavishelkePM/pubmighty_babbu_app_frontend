'use client';

import { Box, Typography } from '@mui/material';

export default function LabeledValue({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>

      {/* IMPORTANT: component="div" so it won't render <p> */}
      <Typography component="div" variant="body2" sx={{ mt: 0.25 }}>
        {children}
      </Typography>
    </Box>
  );
}

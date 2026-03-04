'use client';

import React from 'react';

import {
  Box,
  Paper,
  Typography,
} from '@mui/material';

export default function SectionCard({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Paper>
  );
}
'use client';

import { Chip } from '@mui/material';

export default function EmploymentChip({ value }) {
  if (!value) return <Chip label="—" size="small" />;
  return (
    <Chip
      label={value.replaceAll('_', ' ')}
      size="small"
      variant="outlined"
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

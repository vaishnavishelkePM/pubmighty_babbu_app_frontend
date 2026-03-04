'use client';

import { Chip } from '@mui/material';

export default function DepartmentChip({ value, sx = {} }) {
  if (!value) return <Chip label="—" size="small" />;
  return (
    <Chip
      label={value}
      size="small"
      variant="outlined"
      sx={{ textTransform: 'capitalize', ...sx }}
    />
  );
}

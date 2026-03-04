'use client';

import { Chip, Tooltip } from "@mui/material";

export default function PositionChip({ value, details, sx = {} }) {
  if (!value) return <Chip label="—" size="small" />;
  return (
    <Tooltip title={details} arrow>
      <Chip
        label={value}
        size="small"
        variant="outlined"
        sx={{ textTransform: 'capitalize', cursor: 'pointer', ...sx }}
      />
    </Tooltip>
  );
}
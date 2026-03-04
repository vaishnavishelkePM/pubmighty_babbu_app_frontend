'use client';

import { useState } from 'react';

import { TextField, Autocomplete } from '@mui/material';

const ACTION_OPTIONS = [
  'open-profile',
  'open-notification',
  'open-plans',
  'open-all-matches',
  'open-all-chat',
];

export default function GlobalActionSelector({
  label = 'Select Action',
  value,
  onChange,
  fullWidth = true,
  disabled = false,
}) {
  const [selected, setSelected] = useState(value || null);
  return (
    <Autocomplete
      fullWidth={fullWidth}
      disabled={disabled}
      options={ACTION_OPTIONS}
      value={selected}
      onChange={(_, newValue) => {
        setSelected(newValue);
        onChange && onChange(newValue || '');
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder="Choose action..." />
      )}
    />
  );
}

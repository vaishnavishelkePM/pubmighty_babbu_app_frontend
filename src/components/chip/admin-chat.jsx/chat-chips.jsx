import { Chip } from '@mui/material';

export const SORT_BY_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
  { value: 'last_active', label: 'Last Active' },
  { value: 'coins', label: 'Coins' },
  { value: 'total_spent', label: 'Total Spent' },
];

export function StatusChip({ value }) {
  switch (Number(value)) {
    case 0:
      return <Chip label="Pending" color="default" variant="soft" size="small" />;
    case 1:
      return <Chip label="Active" color="success" variant="soft" size="small" />;
    case 2:
      return <Chip label="Suspended" color="warning" variant="soft" size="small" />;
    case 3:
      return <Chip label="Disabled" color="error" variant="soft" size="small" />;
    default:
      return <Chip label="Unknown" color="default" variant="soft" size="small" />;
  }
}

export function TypeChip({ value }) {
  const v = String(value || 'real');
  if (v === 'bot') return <Chip size="small" variant="outlined" color="warning" label="Bot" />;
  return <Chip size="small" variant="outlined" color="success" label="Real" />;
}

export function RegisterChip({ value }) {
  const v = String(value || '-');
  if (v === 'manual') return <Chip size="small" variant="outlined" color="error" label="Manual" />;
  if (v === 'gmail') return <Chip size="small" variant="outlined" color="success" label="Gmail" />;
  return <Chip size="small" variant="outlined" color="default" label={v || '—'} />;
}

export function YesNoChip({ value, yes = 'Yes', no = 'No' }) {
  const v = value === true || value === 1 || value === '1' || value === 'true';
  return (
    <Chip size="small" variant="outlined" color={v ? 'success' : 'error'} label={v ? yes : no} />
  );
}

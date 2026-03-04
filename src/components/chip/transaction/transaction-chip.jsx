import Chip from '@mui/material/Chip';

export function SpentOnChip({ value }) {
  const v = String(value || '').toLowerCase();
  const map = {
    message: { label: 'Message', color: 'info' },
    video_call: { label: 'Video Call', color: 'secondary' },
    unlock_feature: { label: 'Unlock Feature', color: 'primary' },
    other: { label: 'Other', color: 'default' },
  };
  const item = map[v] || { label: value || '—', color: 'default' };
  return <Chip label={item.label} color={item.color} variant="outlined" size="small" />;
}

export function StatusChip({ value }) {
  const v = String(value || '').toLowerCase();
  if (v === 'completed')
    return <Chip label="Completed" color="success" variant="soft" size="small" />;
  if (v === 'pending') return <Chip label="Pending" color="warning" variant="soft" size="small" />;
  if (v === 'failed') return <Chip label="Failed" color="error" variant="soft" size="small" />;
  if (v === 'refunded') return <Chip label="Refunded" color="info" variant="soft" size="small" />;
  return <Chip label={value || '—'} color="default" variant="soft" size="small" />;
}

export function money(v) {
  if (v === null || typeof v === 'undefined') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2);
}

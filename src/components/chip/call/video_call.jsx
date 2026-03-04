import Chip from '@mui/material/Chip';

export function CallTypeChip({ value }) {
  const v = String(value || '').toLowerCase();
  if (v === 'video') return <Chip label="Video" color="info" variant="soft" size="small" />;
  if (v === 'audio') return <Chip label="Audio" color="warning" variant="soft" size="small" />;
  return <Chip label={value || '—'} color="default" variant="soft" size="small" />;
}

export function StatusChip({ value }) {
  const v = String(value || '').toLowerCase();
  if (v === 'answered')
    return <Chip label="Answered" color="success" variant="soft" size="small" />;
  if (v === 'ended') return <Chip label="Ended" color="default" variant="soft" size="small" />;
  if (v === 'ringing') return <Chip label="Ringing" color="warning" variant="soft" size="small" />;
  if (v === 'initiated') return <Chip label="Initiated" color="info" variant="soft" size="small" />;
  if (v === 'missed') return <Chip label="Missed" color="error" variant="soft" size="small" />;
  if (v === 'rejected') return <Chip label="Rejected" color="error" variant="soft" size="small" />;
  return <Chip label={value || '—'} color="default" variant="soft" size="small" />;
}

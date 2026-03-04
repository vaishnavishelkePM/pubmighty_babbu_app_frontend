export const MODE_OPTIONS = [
  { value: 'GLOBAL', label: 'Send Global' },
  { value: 'FILTERED', label: 'Send Filtered Users' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Auto / Default' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
];

export const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export const STATUS_OPTIONS_VIEW = [
  { value: '', label: 'Any' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
];

export const sortOptions = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'id', label: 'ID' },
  { value: 'sender_id', label: 'Sender ID' },
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
  { value: 'scheduled_at', label: 'Scheduled At' },
  { value: 'sent_at', label: 'Sent At' },
];

export function statusChip(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'sent') return { color: 'success', label: 'Sent' };
  if (s === 'sending') return { color: 'info', label: 'Sending' };
  if (s === 'queued') return { color: 'warning', label: 'Queued' };
  if (s === 'scheduled') return { color: 'secondary', label: 'Scheduled' };
  if (s === 'failed') return { color: 'error', label: 'Failed' };
  if (s === 'canceled') return { color: 'default', label: 'Canceled' };
  if (s === 'draft') return { color: 'default', label: 'Draft' };
  return { color: 'default', label: status || '—' };
}

export function priorityChip(p) {
  const v = String(p || '').toLowerCase();
  if (v === 'high') return { color: 'error', label: 'High' };
  if (v === 'normal') return { color: 'default', label: 'Normal' };
  return { color: 'default', label: p || '—' };
}
export const statusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'inactive') return 'Inactive';
  return 'Unknown';
};

export const statusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'inactive') return 'warning';
  return 'default';
};

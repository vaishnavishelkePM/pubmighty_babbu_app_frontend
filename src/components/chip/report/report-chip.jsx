 export const statusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'spam') return 'Spam';
  if (s === 'rejected') return 'Rejected';
  if (s === 'completed') return 'Completed';
  return 'Unknown';
};

export const statusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'pending') return 'warning';
  if (s === 'spam') return 'error';
  if (s === 'rejected') return 'info';
  if (s === 'completed') return 'success';
  return 'default';
};

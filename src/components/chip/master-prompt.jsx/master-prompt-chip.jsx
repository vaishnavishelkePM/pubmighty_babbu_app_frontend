import { Chip } from '@mui/material';

export function StatusChip({ value }) {
  return (
    <OptionChip
      value={value}
      map={{
        active: { label: 'Active', color: 'success', variant: 'soft' },
        inactive: { label: 'Inactive', color: 'error', variant: 'soft' },
      }}
      fallback="Unknown"
    />
  );
}

export function BoolChip({ value, yesLabel = 'On', noLabel = 'Off' }) {
  const n = value === true || value === 1 || value === '1';
  return (
    <Chip
      label={n ? yesLabel : noLabel}
      size="small"
      variant="outlined"
      color={n ? 'success' : 'error'}
      sx={{ fontWeight: 800 }}
    />
  );
}

export function OptionChip({ value, map = {}, fallback = '—' }) {
  const key = (value ?? '').toString().toLowerCase();
  const item = map[key];

  const label =
    item?.label ??
    (value !== null && typeof value !== 'undefined' && value !== '' ? String(value) : fallback);
  const color = item?.color ?? 'default';
  const variant = item?.variant ?? 'soft';

  return (
    <Chip
      size="small"
      variant={variant}
      color={color}
      label={label}
      sx={{ textTransform: 'capitalize', fontWeight: 800 }}
    />
  );
}

export function PriorityChip({ value }) {
  return (
    <OptionChip
      value={value}
      map={{
        most: { label: 'Most', color: 'success', variant: 'soft' },
        average: { label: 'Average', color: 'warning', variant: 'soft' },
        less: { label: 'Less', color: 'default', variant: 'soft' },
      }}
      fallback="—"
    />
  );
}

export function UserTypeChip({ value }) {
  return (
    <OptionChip
      value={value}
      map={{
        new: { label: 'New', color: 'info', variant: 'soft' },
        existing: { label: 'Existing', color: 'primary', variant: 'soft' },
        all: { label: 'All', color: 'default', variant: 'outlined' },
      }}
      fallback="—"
    />
  );
}

export function UserTimeChip({ value }) {
  return (
    <OptionChip
      value={value}
      map={{
        morning: { label: 'Morning', color: 'warning', variant: 'soft' },
        afternoon: { label: 'Afternoon', color: 'info', variant: 'soft' },
        evening: { label: 'Evening', color: 'primary', variant: 'soft' },
        night: { label: 'Night', color: 'default', variant: 'outlined' },
        all: { label: 'All', color: 'default', variant: 'outlined' },
      }}
      fallback="—"
    />
  );
}

export function BotGenderChip({ value }) {
  return (
    <OptionChip
      value={value}
      map={{
        male: { label: 'Male', color: 'info', variant: 'soft' },
        female: { label: 'Female', color: 'success', variant: 'soft' },
        any: { label: 'Any', color: 'default', variant: 'outlined' },
      }}
      fallback="—"
    />
  );
}

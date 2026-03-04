import { Chip } from '@mui/material';

export function StatusChip({ value }) {
  switch (Number(value)) {
    case 0:
      return <Chip component="span" label="Pending" color="default" variant="soft" size="small" />;
    case 1:
      return <Chip component="span" label="Active" color="success" variant="soft" size="small" />;
    case 2:
      return (
        <Chip component="span" label="Suspended" color="warning" variant="soft" size="small" />
      );
    case 3:
      return <Chip component="span" label="Disabled" color="error" variant="soft" size="small" />;
    default:
      return <Chip component="span" label="Unknown" color="default" variant="soft" size="small" />;
  }
}

export function TwoFaChip({ row }) {
  const v = row?.two_fa ?? row?.twoFactorEnabled ?? 0;
  const n = Number(v) || 0;

  if (n === 0)
    return <Chip component="span" size="small" variant="outlined" color="error" label="Off" />;
  if (n === 1)
    return (
      <Chip component="span" size="small" variant="outlined" color="success" label="On (App)" />
    );
  if (n === 2)
    return (
      <Chip component="span" size="small" variant="outlined" color="success" label="On (Email)" />
    );

  return <Chip component="span" size="small" variant="outlined" label="Unknown" />;
}

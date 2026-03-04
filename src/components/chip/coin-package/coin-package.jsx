import {
  Grid,
  Card,
  Chip,
  Stack,
  Table,
  Button,
  Select,
  Dialog,
  Avatar,
  Tooltip,
  Divider,
  MenuItem,
  TableRow,
  TextField,
  TableCell,
  TableBody,
  TableHead,
  InputLabel,
  Typography,
  IconButton,
  FormControl,
  DialogTitle,
  ListItemText,
  DialogActions,
  DialogContent,
  TableContainer,
  CircularProgress,
} from '@mui/material';

export function YesNoChip({ value, yes = 'Yes', no = 'No' }) {
  const v = value === true || value === 1 || value === '1';
  return (
    <Chip size="small" variant="outlined" color={v ? 'success' : 'error'} label={v ? yes : no} />
  );
}

export function StatusChip({ value }) {
  const v = String(value || '').toLowerCase();
  if (v === 'active') return <Chip size="small" color="success" variant="soft" label="Active" />;
  if (v === 'inactive') return <Chip size="small" color="default" label="Inactive" />;
  return <Chip size="small" color="default" label="Unknown" />;
}

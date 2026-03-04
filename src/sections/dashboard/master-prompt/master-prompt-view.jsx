'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Card,
  Chip,
  Grid,
  Stack,
  Table,
  Button,
  Select,
  Dialog,
  Tooltip,
  Divider,
  Collapse,
  MenuItem,
  TableRow,
  TextField,
  TableCell,
  TableBody,
  TableHead,
  IconButton,
  Typography,
  Pagination,
  InputLabel,
  FormControl,
  DialogTitle,
  ListItemText,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { safeJoin } from 'src/utils/helper';
import { fDate, fTime } from 'src/utils/format-time';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  BoolChip,
  StatusChip,
  PriorityChip,
  UserTypeChip,
  UserTimeChip,
  BotGenderChip,
} from 'src/components/chip/master-prompt.jsx/master-prompt-chip';

import AddMasterPromptView from './add-master-prompt';
import EditMasterPromptView from './edit-master-prompt';

 function buildQuery(filters, page) {
   const qp = new URLSearchParams();
   qp.append('page', String(page || 1));

   if ((filters.search || '').trim()) qp.append('search', String(filters.search).trim());
   if (filters.status) qp.append('status', String(filters.status));
   if ((filters.id || '').toString().trim()) qp.append('id', String(filters.id).trim());
   if (filters.user_type) qp.append('user_type', String(filters.user_type));
   if (filters.user_time) qp.append('user_time', String(filters.user_time));
   if (filters.bot_gender) qp.append('bot_gender', String(filters.bot_gender));
   if ((filters.priority_min || '').toString().trim())
     qp.append('priority_min', String(filters.priority_min).trim());
   if ((filters.priority_max || '').toString().trim())
     qp.append('priority_max', String(filters.priority_max).trim());

   if ((filters.personality_type || '').trim())
     qp.append('personality_type', String(filters.personality_type).trim());

   if (
     filters.location_based !== '' &&
     filters.location_based !== null &&
     typeof filters.location_based !== 'undefined'
   ) {
     qp.append('location_based', String(filters.location_based));
   }

   if (filters.priority_bucket) qp.append('priority', String(filters.priority_bucket));

   if ((filters.created_from || '').trim()) qp.append('created_from', String(filters.created_from));
   if ((filters.created_to || '').trim()) qp.append('created_to', String(filters.created_to));

   if (filters.perPage) qp.append('perPage', String(filters.perPage));

   return qp.toString();
 }

export default function MasterPromptsView() {
  const router = useRouter();

  const defaultFilters = useMemo(
    () => ({
      id: '',
      search: '',
      status: '',

      user_type: '',
      user_time: '',
      bot_gender: '',
      personality_type: '',
      location_based: '',
      priority_min: '',
      priority_max: '',

      created_from: '',
      created_to: '',

      perPage: 25,
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [resetFiltersKey, setResetFiltersKey] = useState(1);

  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const cacheRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteDialog = (row) => {
    setDeleteRow(row);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteRow(null);
  };

  const getToken = () => {
    let token = getCookie('session_key');
    if (!token && typeof window !== 'undefined')
      token = window.localStorage.getItem('session_key') || '';
    return token || null;
  };

  const createdAt = (row) => row?.createdAt || row?.created_at || null;
  const updatedAt = (row) => row?.updatedAt || row?.updated_at || null;

  const fetchMasterPrompts = useCallback(
    async (nextFilters, page = 1, hardReload = false) => {
      const token = getToken();

      if (!token) {
        toast.error('Session expired. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!CONFIG?.apiUrl) {
        toast.error('CONFIG.apiUrl missing. Fix src/global-config');
        return;
      }

      const qs = buildQuery(nextFilters, page);
      const queryKey = qs;

      if (cacheRef.current[queryKey] && !hardReload) {
        const cached = cacheRef.current[queryKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        return;
      }

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/master-prompts?${qs}`);

      try {
        setIsLoading(true);

        const result = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
          validateStatus: () => true,
        });

        const res = result?.data;

        if (result.status === 401 || result.status === 403) {
          toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
          router.push(paths?.auth?.login || '/login');
          return;
        }

        if (!res?.success) {
          toast.error(
            res?.msg || res?.message || `Failed to fetch prompts (HTTP ${result.status})`
          );
          return;
        }

        const prompts = res?.data?.prompts ?? [];
        const pag = res?.data?.pagination ?? {};

        cacheRef.current[queryKey] = { rows: prompts, pagination: pag };
        setRows(prompts);
        setPagination(pag);
      } catch (error) {
        console.error('fetchMasterPrompts NETWORK error:', error);
        toast.error(
          `Network/CORS error. URL: ${safeJoin(CONFIG.apiUrl, `/v1/admin/master-prompts`)}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchMasterPrompts(defaultFilters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- FILTER FORM (BotsView style) ----------------
  const { control, handleSubmit, reset } = useForm({
    defaultValues: defaultFilters,
    mode: 'onBlur',
  });

  const toDayjs = (v) => (v ? dayjs(v, 'YYYY-MM-DD', true) : null);
  const toYMD = (d) => {
    if (!d) return '';
    const dj = dayjs.isDayjs(d) ? d : dayjs(d);
    return dj.isValid() ? dj.format('YYYY-MM-DD') : '';
  };

  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,
      id: String(vals.id || '').replace(/\D/g, ''),
      search: String(vals.search || '').trim(),
      status: String(vals.status || ''),
      priority_min: String(vals.priority_min || '').replace(/\D/g, ''),
      priority_max: String(vals.priority_max || '').replace(/\D/g, ''),

      user_type: String(vals.user_type || ''),
      user_time: String(vals.user_time || ''),
      bot_gender: String(vals.bot_gender || ''),
      personality_type: String(vals.personality_type || '').trim(),

      location_based: vals.location_based === '' ? '' : String(vals.location_based),

      priority_bucket: String(vals.priority_bucket || ''),

      created_from: String(vals.created_from || '').trim(),
      created_to: String(vals.created_to || '').trim(),

      perPage: Number(vals.perPage) || 25,
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchMasterPrompts(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    cacheRef.current = {};
    reset(defaultFilters);
    setResetFiltersKey((x) => x + 1);
    fetchMasterPrompts(defaultFilters, 1, true);
  };

  const hardRefresh = (page = currentPage) => {
    cacheRef.current = {};
    fetchMasterPrompts(filters, page, true);
  };

  const openEditDialog = (row) => {
    const id = Number(row?.id);
    if (!id) return;
    setEditId(id);
    setEditOpen(true);
  };

  const deleteMasterPrompt = async () => {
    const token = getToken();

    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    if (!CONFIG?.apiUrl) {
      toast.error('CONFIG.apiUrl missing. Fix src/global-config');
      return;
    }

    const id = Number(deleteRow?.id);
    if (!id) return toast.error('Invalid prompt id');

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/master-prompts/delete/${id}`);

    try {
      setIsDeleting(true);

      const result = await axios.post(
        url,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
          validateStatus: () => true,
        }
      );

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!res?.success) {
        toast.error(res?.msg || res?.message || `Failed (HTTP ${result.status})`);
        return;
      }

      toast.success(res?.msg || 'Deleted');

      closeDeleteDialog();
      cacheRef.current = {};
      fetchMasterPrompts(filters, currentPage, true);
    } catch (err) {
      console.error('delete master prompt:', err);
      toast.error('Network/CORS error while deleting prompt');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      {/* Header (BotsView style) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Master Prompts"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Master Prompts', href: paths.dashboard.masterPrompts?.root || '#' },
          ]}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          <Button variant="contained" onClick={() => setAddOpen(true)}>
            <Iconify icon="material-symbols:add" sx={{ width: 20, mr: 1 }} />
            Add
          </Button>
        </Box>
      </Box>

      {/* Filters (BotsView structure) */}
      <Collapse in={showFilter} timeout="auto">
        <form onSubmit={handleSubmit(applyFilters)} key={resetFiltersKey}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} md={3}>
                <Controller
                  name="search"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Search"
                      placeholder="Search name/prompt…"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              {/* ID */}
              <Grid item xs={12} md={3}>
                <Controller
                  name="id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Prompt ID"
                      placeholder="Type prompt id…"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(String(e.target.value || '').replace(/\D/g, ''))
                      }
                      inputProps={{ inputMode: 'numeric' }}
                    />
                  )}
                />
              </Grid>
              {/* Status */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Status" value={field.value ?? ''}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Priority */}

              <Grid item xs={12} md={3}>
                <Controller
                  name="priority_min"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Priority ≥ (More than)"
                      placeholder="e.g. 10"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(String(e.target.value || '').replace(/\D/g, ''))
                      }
                      inputProps={{ inputMode: 'numeric' }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="priority_max"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Priority ≤ (Less than)"
                      placeholder="e.g. 50"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(String(e.target.value || '').replace(/\D/g, ''))
                      }
                      inputProps={{ inputMode: 'numeric' }}
                    />
                  )}
                />
              </Grid>

              {/* User Type */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>User Type</InputLabel>
                  <Controller
                    name="user_type"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="User Type" value={field.value ?? ''}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="existing">Existing</MenuItem>
                        <MenuItem value="all">All</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* User Time */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>User Time</InputLabel>
                  <Controller
                    name="user_time"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="User Time" value={field.value ?? ''}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="morning">Morning</MenuItem>
                        <MenuItem value="afternoon">Afternoon</MenuItem>
                        <MenuItem value="evening">Evening</MenuItem>
                        <MenuItem value="night">Night</MenuItem>
                        <MenuItem value="all">All</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Bot Gender */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Bot Gender</InputLabel>
                  <Controller
                    name="bot_gender"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Bot Gender" value={field.value ?? ''}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="any">Any</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Personality */}
              <Grid item xs={12} md={3}>
                <Controller
                  name="personality_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Personality"
                      placeholder="e.g. friendly"
                      fullWidth
                    />
                  )}
                />
              </Grid>

              {/* Location Based */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Location Based</InputLabel>
                  <Controller
                    name="location_based"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Location Based" value={field.value ?? ''}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="1">On</MenuItem>
                        <MenuItem value="0">Off</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Created From */}
              <Grid item xs={12} md={3}>
                <Controller
                  name="created_from"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Created From"
                      value={toDayjs(field.value)}
                      onChange={(d) => field.onChange(toYMD(d))}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                />
              </Grid>

              {/* Created To */}
              <Grid item xs={12} md={3}>
                <Controller
                  name="created_to"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Created To"
                      value={toDayjs(field.value)}
                      onChange={(d) => field.onChange(toYMD(d))}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                />
              </Grid>

              {/* Actions (BotsView button style) */}
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ height: 50 }}
                    disabled={isLoading}
                    startIcon={<Iconify icon="mdi:check" />}
                  >
                    Apply
                  </Button>

                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth
                    sx={{ height: 50 }}
                    disabled={isLoading}
                    onClick={resetFilters}
                    startIcon={<Iconify icon="mdi:refresh" />}
                  >
                    Reset
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </form>
      </Collapse>

      {/* KPI CARD (keep yours, unchanged) */}
      <Card
        sx={{
          display: 'flex',
          mb: 2,
          mt: 2,
          p: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontSize: 14 }} color="text.secondary">
            Total Prompts
          </Typography>

          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {pagination?.totalItems ?? 0}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            p: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: '#00B8D9',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(0,184,217,0.35)',
          }}
        >
          <Iconify icon="mdi:text-box-multiple" />
        </Box>
      </Card>
      {/* TABLE (unchanged) */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton cols={10} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>User Type</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>User Time</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Bot Gender</TableCell>
                  <TableCell>Personality</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Created</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>

                    <TableCell sx={{ maxWidth: 420 }}>
                      <Stack spacing={0.4} sx={{ maxWidth: 420 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={row?.name || ''}
                        >
                          {row?.name || '—'}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={row?.prompt || ''}
                        >
                          {row?.prompt || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <UserTypeChip value={row?.user_type} />
                    </TableCell>

                    <TableCell>
                      <UserTimeChip value={row?.user_time} />
                    </TableCell>

                    <TableCell>
                      <BotGenderChip value={row?.bot_gender} />
                    </TableCell>

                    <TableCell>
                      {row?.personality_type ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={row.personality_type}
                          sx={{ fontWeight: 800 }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    <TableCell>
                      <BoolChip value={row?.location_based} yesLabel="On" noLabel="Off" />
                    </TableCell>

                    <TableCell>
                      <PriorityChip value={row?.priority_bucket || row?.priority} />
                    </TableCell>

                    <TableCell>
                      <StatusChip value={row?.status} />
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                      <ListItemText
                        primary={createdAt(row) ? fDate(createdAt(row)) : '—'}
                        secondary={createdAt(row) ? fTime(createdAt(row)) : ''}
                        primaryTypographyProps={{ typography: 'body2' }}
                        secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                      />
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                      <ListItemText
                        primary={updatedAt(row) ? fDate(updatedAt(row)) : '—'}
                        secondary={updatedAt(row) ? fTime(updatedAt(row)) : ''}
                        primaryTypographyProps={{ typography: 'body2' }}
                        secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelected(row);
                              setViewOpen(true);
                            }}
                          >
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openEditDialog(row)}
                          >
                            <Iconify icon="mage:edit-fill" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDeleteDialog(row)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                <TableNoData notFound={(pagination?.totalItems ?? 0) === 0} />
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* DELETE DIALOG (unchanged) */}
      <Dialog
        open={deleteOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Master Prompt</DialogTitle>

        <DialogContent>
          <Typography sx={{ mt: 0.5 }}>
            Are you sure you want to delete{' '}
            <b>{deleteRow?.name || `ID: ${deleteRow?.id || '—'}`}</b>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            This will mark the prompt as <b>inactive</b>.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={closeDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={deleteMasterPrompt}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pagination (unchanged) */}
      <Stack direction="row" justifyContent="center" alignItems="center" sx={{ m: 2 }}>
        <Pagination
          count={pagination?.totalPages || 1}
          page={currentPage}
          onChange={(_, p) => {
            setCurrentPage(p);
            fetchMasterPrompts(filters, p);
          }}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* ---------------- VIEW DIALOG ---------------- */}

      <Dialog
        fullWidth
        maxWidth="lg" // Increased to LG for better spacing
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: (theme) => theme.customShadows.z24,
            backgroundImage: 'none',
          },
        }}
      >
        {/* Header Section */}
        <DialogTitle
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <Iconify icon="material-symbols:edit-outline" width={24} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selected?.name || 'Master Prompt Configuration'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                System Manifest • ID: {selected?.id}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Copy to Clipboard">
              <Button
                variant="soft"
                color="inherit"
                startIcon={<Iconify icon="solar:copy-bold" />}
                onClick={() => {
                  navigator.clipboard.writeText(selected?.prompt || '');
                  toast.success('Prompt copied!');
                }}
              >
                Copy
              </Button>
            </Tooltip>
            <IconButton onClick={() => setViewOpen(false)}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {/* TOP SECTION: Meta Information Grid */}
          <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>
            Configuration & Targeting
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'User Segment', value: <UserTypeChip value={selected?.user_type} /> },
              { label: 'Bot Identity', value: <BotGenderChip value={selected?.bot_gender} /> },
              { label: 'Ideal Execution', value: <UserTimeChip value={selected?.user_time} /> },
              {
                label: 'Tone/Personality',
                value: (
                  <Chip
                    label={selected?.personality_type || 'General'}
                    variant="soft"
                    color="info"
                    sx={{ fontWeight: 700 }}
                  />
                ),
              },
              {
                label: 'Priority Bucket',
                value: <PriorityChip value={selected?.priority_bucket || selected?.priority} />,
              },
              {
                label: 'Location Logic',
                value: (
                  <BoolChip
                    value={selected?.location_based}
                    yesLabel="Geo-Enabled"
                    noLabel="Universal"
                  />
                ),
              },
              { label: 'Current Status', value: <StatusChip value={selected?.status} /> },
              {
                label: 'Last Modified',
                value: (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {fDate(updatedAt(selected))}{' '}
                    <small style={{ opacity: 0.5 }}>{fTime(updatedAt(selected))}</small>
                  </Typography>
                ),
              },
            ].map((item, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Stack
                  spacing={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {item.label}
                  </Typography>
                  <Box>{item.value}</Box>
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

          {/* BOTTOM SECTION: Prompt Payload */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
                Instructional Payload (Prompt)
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {selected?.prompt?.length || 0} characters
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'light' ? 'grey.100' : 'grey.900'),
                border: (theme) => `1px solid ${theme.palette.divider}`,
                minHeight: '250px',
                maxHeight: '450px',
                overflow: 'auto',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.95rem',
                  lineHeight: 1.8,
                  color: (theme) => (theme.palette.mode === 'light' ? 'grey.800' : 'grey.300'),
                }}
              >
                {selected?.prompt || 'No content provided.'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: 'background.neutral' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => {
              setViewOpen(false);
              openEditDialog(selected);
            }}
          >
            Edit
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => setViewOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <AddMasterPromptView
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          setCurrentPage(1);
          hardRefresh(1);
        }}
      />

      <EditMasterPromptView
        open={editOpen}
        promptId={editId}
        onClose={() => setEditOpen(false)}
        onUpdated={() => {
          setEditOpen(false);
          hardRefresh(currentPage);
        }}
      />
    </DashboardContent>
  );
}

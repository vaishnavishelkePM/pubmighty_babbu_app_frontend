'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import PaginationItem from '@mui/material/PaginationItem';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { paths } from 'src/routes/paths';

import { safeJoin } from 'src/utils/helper';
import { getToken } from 'src/utils/user-helper';
import { fDate, fTime } from 'src/utils/format-time';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import CountryBadge from 'src/components/chip/country-badge';
import LabeledValue from 'src/components/lables/labeled-value';
import UserSelector from 'src/components/selectors/user-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { StatusChip, SpentOnChip } from 'src/components/chip/transaction/transaction-chip';

export default function CoinSpentTransactionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didInitRef = useRef(false);

  const defaultFilters = useMemo(
    () => ({
      id: '',
      user_id: '',
      spent_on: '',
      message_id: '',
      video_call_id: '',
      status: '',
      description: '',
      min_coins: '',
      max_coins: '',
      start_date: '',
      end_date: '',
      include_user: true,
      include_message: false,
      include_video_call: false,
      sortBy: 'date',
      order: 'DESC',
      limit: 20,
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);

  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });

  const cacheRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);

  // view dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const avatarLightbox = useImageLightbox();

  const avatarSrc = (user) => {
    const av =
      user?.avatar ||
      user?.profile_image ||
      user?.profileImage ||
      user?.avatar_url ||
      user?.avatarUrl ||
      '';
    if (!av) return '';
    if (String(av).startsWith('http')) return av;

    let p = String(av);
    if (!p.startsWith('uploads/')) p = `uploads/avatar/user/${p}`;

    const raw = safeJoin(CONFIG.assetsUrl, p);
    const v =
      user?.updated_at || user?.updatedAt || user?.created_at || user?.createdAt || Date.now();

    return raw.includes('?')
      ? `${raw}&v=${encodeURIComponent(v)}`
      : `${raw}?v=${encodeURIComponent(v)}`;
  };

  const buildQuery = useCallback((f, page = 1) => {
    const qp = new URLSearchParams();
    qp.set('page', String(page || 1));
    qp.set('limit', String(Number(f.limit || 20)));

    if (String(f.id || '').trim()) qp.set('id', String(f.id).trim());
    if (String(f.user_id || '').trim()) qp.set('user_id', String(f.user_id).trim());
    if (String(f.spent_on || '').trim()) qp.set('spent_on', String(f.spent_on).trim());
    if (String(f.message_id || '').trim()) qp.set('message_id', String(f.message_id).trim());
    if (String(f.video_call_id || '').trim())
      qp.set('video_call_id', String(f.video_call_id).trim());
    if (String(f.status || '').trim()) qp.set('status', String(f.status).trim());
    if (String(f.description || '').trim()) qp.set('description', String(f.description).trim());
    if (String(f.min_coins || '').trim()) qp.set('min_coins', String(f.min_coins).trim());
    if (String(f.max_coins || '').trim()) qp.set('max_coins', String(f.max_coins).trim());

    if (String(f.start_date || '').trim()) qp.set('start_date', String(f.start_date).trim());
    if (String(f.end_date || '').trim()) qp.set('end_date', String(f.end_date).trim());

    qp.set('include_user', String(!!f.include_user));
    qp.set('include_message', String(!!f.include_message));
    qp.set('include_video_call', String(!!f.include_video_call));

    qp.set('sortBy', String(f.sortBy || 'date'));
    qp.set('order', String(f.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    return qp.toString();
  }, []);

  const fetchTransactions = useCallback(
    async (filter, page = 1, hardReload = false) => {
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

      const qs = buildQuery(filter, page);
      const queryKey = qs;

      if (cacheRef.current[queryKey] && !hardReload) {
        const cached = cacheRef.current[queryKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        return;
      }

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/coin-spent-transaction?${qs}`);

      try {
        setIsLoading(true);

        const result = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
          validateStatus: () => true,
        });

        const res = result?.data;

        if (result.status === 401 || result.status === 403) {
          toast.error(res?.message || res?.msg || 'Unauthorized. Please login again.');
          router.push(paths?.auth?.login || '/login');
          return;
        }

        if (!res?.success) {
          toast.error(
            res?.message || res?.msg || `Failed to fetch transactions (HTTP ${result.status})`
          );
          return;
        }

        const items = res?.data?.transactions ?? [];
        const pag = res?.data?.pagination ?? {
          page,
          limit: Number(filter.limit || 20),
          total: 0,
          totalPages: 1,
          hasMore: false,
        };

        cacheRef.current[queryKey] = { rows: items, pagination: pag };
        setRows(items);
        setPagination(pag);
      } catch (error) {
        console.error('fetchTransactions NETWORK error:', error);
        toast.error(`Network/CORS error: ${url}`);
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, router]
  );

  // FILTER FORM
  const {
    control: filterControl,
    handleSubmit: handleFilterSubmit,
    reset: resetFilterForm,
    setValue,
  } = useForm({
    defaultValues: defaultFilters,
    mode: 'onBlur',
  });

  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,

      limit: Number(vals.limit || 20),
      include_user: !!vals.include_user,
      include_message: !!vals.include_message,
      include_video_call: !!vals.include_video_call,

      order: String(vals.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      sortBy: String(vals.sortBy || 'date'),

      id: String(vals.id || '').trim(),
      user_id: String(vals.user_id || '').trim(),
      spent_on: String(vals.spent_on || '').trim(),
      message_id: String(vals.message_id || '').trim(),
      video_call_id: String(vals.video_call_id || '').trim(),
      status: String(vals.status || '').trim(),
      description: String(vals.description || '').trim(),
      min_coins: String(vals.min_coins || '').trim(),
      max_coins: String(vals.max_coins || '').trim(),
      start_date: String(vals.start_date || '').trim(),
      end_date: String(vals.end_date || '').trim(),
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchTransactions(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    resetFilterForm(defaultFilters);
    cacheRef.current = {};
    fetchTransactions(defaultFilters, 1, true);
  };

  //  auto-apply message_id from URL
  useEffect(() => {
    const messageIdFromUrl = String(searchParams.get('message_id') || '').trim();

    if (!messageIdFromUrl) {
      if (!didInitRef.current) {
        didInitRef.current = true;
        fetchTransactions(defaultFilters, 1, true);
      }
      return;
    }

    if (didInitRef.current) return;
    didInitRef.current = true;

    const next = {
      ...defaultFilters,
      message_id: messageIdFromUrl,
      include_message: true,
    };

    setFilters(next);
    setCurrentPage(1);
    resetFilterForm(next);
    setShowFilter(true);

    cacheRef.current = {};
    fetchTransactions(next, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // VIEW
  const viewRow = (row) => {
    setSelected(row);
    setViewOpen(true);
  };

  const txDate = (row) => row?.date || row?.created_at || row?.createdAt || null;
  const createdAt = (row) => row?.created_at || row?.createdAt || null;

  const userObj = (row) => row?.user || null;
  const messageObj = (row) => row?.message || null;
  const callObj = (row) => row?.videoCall || null;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Coin Spent Transactions"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Coin Packages', href: paths.dashboard.coinPackages?.root || '#' },
            {
              name: 'Spent Transactions',
              href: paths.dashboard?.coinPackages?.spentTransactions || '#',
            },
          ]}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          <Button
            variant="contained"
            onClick={() => fetchTransactions(filters, currentPage, true)}
            disabled={isLoading}
          >
            <Iconify icon="solar:refresh-bold" sx={{ width: 20, mr: 1 }} />
            Refresh
          </Button>
        </Box>
      </Box>

      {/*  FILTER (rewritten like your reference) */}
      <Collapse in={showFilter}>
        <form onSubmit={handleFilterSubmit(applyFilters)}>
          <Grid container spacing={2} sx={{ pb: 2 }}>
            <Grid item xs={12} md={3}>
              <Controller
                name="id"
                control={filterControl}
                render={({ field }) => <TextField {...field} label=" ID" fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <UserSelector
                label="User"
                placeholder="Type username OR user id…"
                valueId={filters.user_id ? Number(filters.user_id) : undefined}
                onUserSelect={(id) => {
                  const nextId = id ? String(id) : '';
                  setValue('user_id', nextId, { shouldDirty: true, shouldValidate: true });
                  setFilters((p) => ({ ...p, user_id: nextId }));
                }}
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Spent On</InputLabel>
                <Controller
                  name="spent_on"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Spent On" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="message">Message</MenuItem>
                      <MenuItem value="video_call">Video Call</MenuItem>
                      <MenuItem value="unlock_feature">Unlock Feature</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="message_id"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Message ID"
                    fullWidth
                    onChange={(e) => {
                      field.onChange(e);
                      setFilters((p) => ({ ...p, message_id: String(e.target.value || '') }));
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="video_call_id"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Video Call ID"
                    fullWidth
                    onChange={(e) => {
                      field.onChange(e);
                      setFilters((p) => ({ ...p, video_call_id: String(e.target.value || '') }));
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Controller
                  name="status"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Status" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="refunded">Refunded</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="min_coins"
                control={filterControl}
                render={({ field }) => <TextField {...field} label="Min Coins" fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="max_coins"
                control={filterControl}
                render={({ field }) => <TextField {...field} label="Max Coins" fullWidth />}
              />
            </Grid>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid item xs={12} sm={6} md={3}>
                <Controller
                  name="start_date"
                  control={filterControl}
                  render={({ field }) => (
                    <DatePicker
                      label="Start Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(newValue) => {
                        const iso = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
                        field.onChange(iso);
                        setFilters((p) => ({ ...p, start_date: iso }));
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Controller
                  name="end_date"
                  control={filterControl}
                  render={({ field }) => (
                    <DatePicker
                      label="End Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(newValue) => {
                        const iso = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
                        field.onChange(iso);
                        setFilters((p) => ({ ...p, end_date: iso }));
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                />
              </Grid>
            </LocalizationProvider>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Controller
                  name="sortBy"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Sort By" value={field.value ?? 'date'}>
                      <MenuItem value="date">Date</MenuItem>
                      <MenuItem value="created_at">Created</MenuItem>
                      <MenuItem value="id">ID</MenuItem>
                      <MenuItem value="user_id">User ID</MenuItem>
                      <MenuItem value="coins">Coins</MenuItem>
                      <MenuItem value="spent_on">Spent On</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="message_id">Message ID</MenuItem>
                      <MenuItem value="video_call_id">Video Call ID</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Controller
                  name="order"
                  control={filterControl}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Order"
                      value={String(field.value || 'DESC').toUpperCase()}
                      onChange={(e) =>
                        field.onChange(String(e.target.value || 'DESC').toUpperCase())
                      }
                    >
                      <MenuItem value="ASC">ASC</MenuItem>
                      <MenuItem value="DESC">DESC</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid
              item
              xs={12}
              md={4}
              sx={{ gap: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Button
                type="button"
                variant="outlined"
                fullWidth
                disabled={isLoading}
                sx={{ height: 50 }}
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                sx={{ height: 50 }}
                fullWidth
                variant="contained"
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </form>
      </Collapse>

      {/* KPI */}
      <Card
        sx={{
          display: 'flex',
          mb: 2,
          mt: 2,
          p: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontSize: 14 }}>Total Spent Transactions</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{pagination?.total ?? 0}</Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            p: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: '#8E33FF',
            color: '#fff',
          }}
        >
          <Iconify icon="solar:wallet-bold" />
        </Box>
      </Card>

      {/* TABLE */}
      <Card>
        {isLoading ? (
          <TableSkeleton cols={12} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Coins</TableCell>
                  <TableCell>Spent On</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Message ID</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Video Call ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => {
                  const u = userObj(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            onClick={() => avatarLightbox.open([avatarSrc(u)], 0)}
                            alt={u?.full_name || `User #${row.user_id}`}
                            src={avatarSrc(u)}
                            sx={{ width: 40, height: 40 }}
                            imgProps={{
                              onError: (e) => {
                                e.currentTarget.src = '/assets/images/avatar_default.png';
                              },
                            }}
                          />
                          <ListItemText
                            primary={u?.full_name || `User #${row.user_id}`}
                            secondary={
                              <Typography component="span" variant="body2" color="text.secondary">
                                {u?.email || u?.phone || '—'}
                              </Typography>
                            }
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={`${row.coins ?? 0}`}
                          size="small"
                          variant="soft"
                          color="error"
                        />
                      </TableCell>

                      <TableCell>
                        <SpentOnChip value={row.spent_on} />
                      </TableCell>

                      <TableCell>{row.message_id || '—'}</TableCell>
                      <TableCell>{row.video_call_id || '—'}</TableCell>

                      <TableCell>
                        <StatusChip value={row.status} />
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                        <ListItemText
                          primary={txDate(row) ? fDate(txDate(row)) : '—'}
                          secondary={txDate(row) ? fTime(txDate(row)) : ''}
                          primaryTypographyProps={{ typography: 'body2' }}
                          secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View details">
                            <IconButton size="small" color="primary" onClick={() => viewRow(row)}>
                              <Iconify icon="solar:eye-bold" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableNoData notFound={(pagination?.total ?? 0) === 0} />
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* PAGINATION */}
      <Stack
        spacing={2}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          m: 2,
        }}
      >
        <Pagination
          count={pagination?.totalPages || 1}
          page={currentPage}
          onChange={(_, p) => {
            setCurrentPage(p);
            fetchTransactions(filters, p, true);
          }}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* VIEW DIALOG (kept same) */}
      {/* VIEW DIALOG - Professional UI */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows.z24,
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.neutral',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                bgcolor: (theme) =>
                  dayjs().isBefore(dayjs()) ? 'primary.lighter' : 'primary.soft', // dynamic theme helper
              }}
            >
              <Iconify icon="solar:clipboard-list-bold" width={24} />
            </Box>
            <Box>
              <Typography variant="h6">Transaction Details</Typography>
              <Typography variant="caption" color="text.secondary">
                ID: #{selected?.id}
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={() => setViewOpen(false)} sx={{ color: 'text.disabled' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: 'background.default' }}>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Left Column: Transaction & References */}
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                {/* Transaction Card */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 2,
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Iconify icon="solar:wallet-money-bold" sx={{ color: 'primary.main' }} />
                    Financial Overview
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <LabeledValue label="Coins Spent">
                        <Typography variant="h5" color="error.main">
                          {selected?.coins ?? 0}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Status">
                        <StatusChip value={selected?.status} />
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Spent On">
                        <SpentOnChip value={selected?.spent_on} />
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Date">
                        {txDate(selected) ? fDate(txDate(selected)) : '—'}
                        <Typography variant="caption" display="block" color="text.disabled">
                          {txDate(selected) ? fTime(txDate(selected)) : ''}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </Grid>

            {/* Right Column: User & Entity Specifics */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* User Info Card */}
                {userObj(selected) && (
                  <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}
                    >
                      Customer Profile
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={avatarSrc(userObj(selected))}
                        sx={{
                          width: 64,
                          height: 64,
                          border: '2px solid #fff',
                          boxShadow: (theme) => theme.customShadows.z8,
                        }}
                      />
                      <Box overflow="hidden">
                        <Typography variant="subtitle1" noWrap>
                          {userObj(selected)?.full_name || 'Guest User'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {userObj(selected)?.email || 'No Email'}
                        </Typography>
                        {userObj(selected)?.country && (
                          <Box sx={{ mt: 0.5 }}>
                            <CountryBadge code={userObj(selected)?.country} />
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                )}

                {/* Contextual Info (Message or Call) */}
                {(messageObj(selected) || callObj(selected)) && (
                  <Box
                    sx={{ p: 2.5, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                      Content Preview
                    </Typography>

                    {messageObj(selected) ? (
                      <Stack spacing={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontStyle: 'italic',
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            p: 1.5,
                            borderRadius: 1,
                          }}
                        >
                          "{messageObj(selected)?.message || 'Empty message body'}"
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Type: {messageObj(selected)?.message_type}
                        </Typography>
                      </Stack>
                    ) : (
                      <Stack spacing={1}>
                        <LabeledValue label="Call Status" value={callObj(selected)?.status} />
                        <LabeledValue
                          label="Duration Info"
                          value={callObj(selected)?.start_time ? 'Available' : 'No timing data'}
                        />
                      </Stack>
                    )}
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setViewOpen(false)}
            sx={{ px: 4 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

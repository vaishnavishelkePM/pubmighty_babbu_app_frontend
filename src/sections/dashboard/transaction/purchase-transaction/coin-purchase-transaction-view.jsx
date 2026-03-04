'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { getToken } from 'src/utils/user-helper';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
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
import { fDate, fTime } from 'src/utils/format-time';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LabeledValue from 'src/components/lables/labeled-value';
import UserSelector from 'src/components/selectors/user-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CoinPackageSelector from 'src/components/selectors/coin-package-selector';
import { money, StatusChip } from 'src/components/chip/transaction/transaction-chip';

export default function CoinPurchaseTransactionsView() {
  const router = useRouter();

  const defaultFilters = useMemo(
    () => ({
      id: '',
      user_id: '',
      coin_pack_id: '',
      provider: '',
      status: '',
      payment_status: '',
      order_id: '',
      product_id: '',
      transaction_id: '',
      purchase_token: '',
      package_name: '',
      min_amount: '',
      max_amount: '',
      min_coins: '',
      max_coins: '',
      start_date: '',
      end_date: '',
      include_user: true,
      include_package: true,
      sortBy: 'created_at',
      order: 'DESC',
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);

  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const cacheRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);

  // view dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const coinPackIdNum = Number(filters.coin_pack_id);
  const avatarSrc = (u) => {
    const av = u?.avatar || u?.profile_image || u?.profileImage || '';
    if (!av) return '';
    if (String(av).startsWith('http')) return av;

    let path = String(av);
    if (!path.startsWith('uploads/')) path = `uploads/avatar/user/${path}`;
    const raw = safeJoin(CONFIG.assetsUrl, path);

    const v = u?.avatar_updated_at || u?.updated_at || u?.updatedAt || u?.createdAt || Date.now();
    return raw.includes('?')
      ? `${raw}&v=${encodeURIComponent(v)}`
      : `${raw}?v=${encodeURIComponent(v)}`;
  };
  const packageCoverSrc = (p) => {
    const cover = p?.cover || '';
    if (!cover) return '';

    if (String(cover).startsWith('http')) return cover;

    const raw = safeJoin(CONFIG.assetsUrl, `images/coin-packages/${cover}`);

    const v = p?.updated_at || p?.updatedAt || Date.now();
    return raw.includes('?')
      ? `${raw}&v=${encodeURIComponent(v)}`
      : `${raw}?v=${encodeURIComponent(v)}`;
  };

  const buildQuery = useCallback((f, page = 1) => {
    const qp = new URLSearchParams();
    qp.set('page', String(page || 1));

    const addIf = (key, val) => {
      const v = String(val ?? '').trim();
      if (v) qp.set(key, v);
    };

    addIf('id', f.id);
    addIf('user_id', f.user_id);
    addIf('coin_pack_id', f.coin_pack_id);

    if ((f.provider || '').trim()) qp.set('provider', String(f.provider).trim());
    if ((f.status || '').trim()) qp.set('status', String(f.status).trim());
    if ((f.payment_status || '').trim()) qp.set('payment_status', String(f.payment_status).trim());

    addIf('order_id', f.order_id);
    addIf('product_id', f.product_id);
    addIf('transaction_id', f.transaction_id);
    addIf('purchase_token', f.purchase_token);
    addIf('package_name', f.package_name);

    addIf('min_amount', f.min_amount);
    addIf('max_amount', f.max_amount);

    addIf('min_coins', f.min_coins);
    addIf('max_coins', f.max_coins);

    addIf('start_date', f.start_date); // ISO string
    addIf('end_date', f.end_date);

    // sorting
    qp.set('sortBy', String(f.sortBy || 'created_at'));
    qp.set('order', String(f.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    // include toggles: accept true/false, "1"/"0", etc.
    qp.set('include_user', String(!!f.include_user));
    qp.set('include_package', String(!!f.include_package));

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

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/coin-purchase-transaction?${qs}`);

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
            res?.msg || res?.message || `Failed to fetch transactions (HTTP ${result.status})`
          );
          return;
        }

        const items = res?.data?.transactions ?? [];
        const pagApi = res?.data?.pagination ?? {};

        const pag = {
          page: pagApi.page ?? page,
          perPage: pagApi.limit ?? 20,
          totalItems: pagApi.total ?? 0,
          totalPages: pagApi.totalPages ?? 1,
          hasMore: !!pagApi.hasMore,
        };

        cacheRef.current[queryKey] = { rows: items, pagination: pag };
        setRows(items);
        setPagination(pag);
      } catch (error) {
        console.error('fetchTransactions NETWORK error:', error);
        toast.error(
          `Network/CORS error. URL: ${safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/coin-purchase-transaction?${qs}`)}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, router]
  );

  useEffect(() => {
    fetchTransactions(defaultFilters, 1, true);
  }, []);
  const txnDate = (row) => row?.date || row?.transaction_date || createdAt(row) || null;
  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,

      // normalize numbers-as-strings
      id: String(vals.id || '').trim(),
      user_id: String(vals.user_id || '').trim(),
      coin_pack_id: String(vals.coin_pack_id || '').trim(),

      min_amount: String(vals.min_amount || '').trim(),
      max_amount: String(vals.max_amount || '').trim(),
      min_coins: String(vals.min_coins || '').trim(),
      max_coins: String(vals.max_coins || '').trim(),

      start_date: String(vals.start_date || '').trim(),
      end_date: String(vals.end_date || '').trim(),

      include_user: !!vals.include_user,
      include_package: typeof vals.include_package === 'undefined' ? true : !!vals.include_package,

      sortBy: String(vals.sortBy || 'created_at'),
      order: String(vals.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchTransactions(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchTransactions(defaultFilters, 1, true);
  };

  const openView = (row) => {
    setSelected(row);
    setViewOpen(true);
  };
  const avatarLightbox = useImageLightbox();
  const pkg = (row) => row?.package || null;
  const user = (row) => row?.user || null;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Coin Purchase Transactions"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Coin Purchases', href: paths.dashboard.coinPurchases?.root || '#' },
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
            onClick={() => {
              cacheRef.current = {};
              fetchTransactions(filters, currentPage, true);
            }}
          >
            <Iconify icon="solar:refresh-bold" sx={{ width: 20, mr: 1 }} />
            Refresh
          </Button>
        </Box>
      </Box>

      <Collapse in={showFilter}>
        <Card sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label=" ID"
                value={filters.id}
                onChange={(e) => setFilters((p) => ({ ...p, id: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <UserSelector
                label="User"
                placeholder="Search username…"
                valueId={filters.user_id ? Number(filters.user_id) : undefined} // optional (works only if /users/:id exists)
                onUserSelect={(id, user) => {
                  setFilters((p) => ({
                    ...p,
                    user_id: id ? String(id) : '',
                  }));
                }}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { height: 56 },
                  '& .MuiFormHelperText-root': { mt: 0.5 },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <CoinPackageSelector
                label="Coin Package"
                placeholder="Search package name…"
                valueId={
                  Number.isFinite(coinPackIdNum) && coinPackIdNum > 0 ? coinPackIdNum : undefined
                }
                status="active"
                provider="google_play"
                onPackageSelect={(id, pkg) => {
                  // id can be '' on clear
                  setFilters((p) => ({
                    ...p,
                    coin_pack_id: id ? String(id) : '',
                  }));
                }}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { height: 56 },
                  '& .MuiFormHelperText-root': { mt: 0.5 },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  label="Provider"
                  value={filters.provider ?? ''}
                  onChange={(e) => setFilters((p) => ({ ...p, provider: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="google_play">Google Play</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filters.status ?? ''}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="completed">completed</MenuItem>
                  <MenuItem value="failed">failed</MenuItem>
                  <MenuItem value="refunded">refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  label="Payment Status"
                  value={filters.payment_status ?? ''}
                  onChange={(e) => setFilters((p) => ({ ...p, payment_status: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="completed">completed</MenuItem>
                  <MenuItem value="failed">failed</MenuItem>
                  <MenuItem value="refunded">refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Order ID"
                value={filters.order_id}
                onChange={(e) => setFilters((p) => ({ ...p, order_id: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Product ID"
                value={filters.product_id}
                onChange={(e) => setFilters((p) => ({ ...p, product_id: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Transaction ID"
                value={filters.transaction_id}
                onChange={(e) => setFilters((p) => ({ ...p, transaction_id: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Min Amount"
                value={filters.min_amount}
                onChange={(e) => setFilters((p) => ({ ...p, min_amount: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Max Amount"
                value={filters.max_amount}
                onChange={(e) => setFilters((p) => ({ ...p, max_amount: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Min Coins"
                value={filters.min_coins}
                onChange={(e) => setFilters((p) => ({ ...p, min_coins: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Max Coins"
                value={filters.max_coins}
                onChange={(e) => setFilters((p) => ({ ...p, max_coins: e.target.value }))}
                fullWidth
              />
            </Grid>
            {/*
            <Grid item xs={12} md={3}>
              <TextField
                label="Start Date (ISO)"
                placeholder="2026-01-01"
                value={filters.start_date}
                onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="End Date (ISO)"
                placeholder="2026-01-12"
                value={filters.end_date}
                onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))}
                fullWidth
              />
            </Grid> */}

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.start_date ? dayjs(filters.start_date) : null}
                  onChange={(newValue) => {
                    setFilters((p) => ({
                      ...p,
                      start_date: newValue ? dayjs(newValue).format('YYYY-MM-DD') : '',
                    }));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={filters.end_date ? dayjs(filters.end_date) : null}
                  onChange={(newValue) => {
                    setFilters((p) => ({
                      ...p,
                      end_date: newValue ? dayjs(newValue).format('YYYY-MM-DD') : '',
                    }));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            </LocalizationProvider>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  label="Sort By"
                  value={filters.sortBy ?? 'created_at'}
                  onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
                >
                  <MenuItem value="created_at">created_at</MenuItem>
                  <MenuItem value="updated_at">updated_at</MenuItem>
                  <MenuItem value="date">date</MenuItem>
                  <MenuItem value="amount">amount</MenuItem>
                  <MenuItem value="coins_received">coins_received</MenuItem>
                  <MenuItem value="status">status</MenuItem>
                  <MenuItem value="payment_status">payment_status</MenuItem>
                  <MenuItem value="user_id">user_id</MenuItem>
                  <MenuItem value="coin_pack_id">coin_pack_id</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  label="Order"
                  value={String(filters.order || 'DESC').toUpperCase()}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      order: String(e.target.value || 'DESC').toUpperCase(),
                    }))
                  }
                >
                  <MenuItem value="ASC">ASC</MenuItem>
                  <MenuItem value="DESC">DESC</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
              <Button
                type="button"
                variant="outlined"
                fullWidth
                disabled={isLoading}
                sx={{ height: '50px' }}
                onClick={resetFilters}
              >
                Reset
              </Button>

              <Button
                type="button"
                disabled={isLoading}
                sx={{ height: '50px' }}
                fullWidth
                variant="contained"
                onClick={() => applyFilters(filters)}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Collapse>

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
          <Typography sx={{ fontSize: 14 }}>Total Transactions</Typography>
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
            bgcolor: '#8E33FF',
            color: '#fff',
          }}
        >
          <Iconify icon="mdi:cash-sync" />
        </Box>
      </Card>

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
                  <TableCell>Package</TableCell>
                  <TableCell>Coins</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Order ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Tx ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => {
                  const u = user(row);
                  const p = pkg(row);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        {u ? (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              alt={u.full_name}
                              onClick={() => avatarLightbox.open([avatarSrc(u)], 0)}
                              src={avatarSrc(u)}
                              sx={{ width: 38, height: 38 }}
                              imgProps={{
                                onError: (e) => {
                                  e.currentTarget.src = '/assets/images/avatar_default.png';
                                },
                              }}
                            />
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                              >
                                {u.full_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {u.email || u.phone || '—'}
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              sx={{ width: 38, height: 38 }}
                              src="/assets/images/avatar_default.png"
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                #{row.user_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        {p ? (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              variant="rounded"
                              onClick={() => avatarLightbox.open([packageCoverSrc(p)], 0)}
                              src={packageCoverSrc(p)}
                              sx={{ width: 44, height: 44, borderRadius: 2 }}
                              imgProps={{
                                onError: (e) => {
                                  e.currentTarget.src = '/assets/images/image_placeholder.png';
                                },
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {p.name || `#${row.coin_pack_id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.google_product_id ||
                                  (p.coins ? `${p.coins} coins` : `Pack #${row.coin_pack_id}`)}
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              variant="rounded"
                              sx={{ width: 44, height: 44, borderRadius: 2 }}
                              src="/assets/images/image_placeholder.png"
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                #{row.coin_pack_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </TableCell>

                      <TableCell>{row.coins_received ?? '—'}</TableCell>
                      <TableCell>{money(row.amount)}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        {row.provider || '—'}
                      </TableCell>
                      <TableCell>{row.order_id || '—'}</TableCell>
                      <TableCell>{row.product_id || '—'}</TableCell>
                      <TableCell>{row.transaction_id || '—'}</TableCell>

                      <TableCell>
                        <StatusChip value={row.status} />
                      </TableCell>

                      <TableCell>
                        <StatusChip value={row.payment_status} />
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                        <ListItemText
                          primary={txnDate(row) ? fDate(txnDate(row)) : '—'}
                          secondary={txnDate(row) ? fTime(txnDate(row)) : ''}
                          primaryTypographyProps={{ typography: 'body2' }}
                          secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="View details">
                          <IconButton size="small" color="primary" onClick={() => openView(row)}>
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableNoData notFound={(pagination?.totalItems ?? 0) === 0} />
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

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

      {/* VIEW DIALOG */}
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
                width: 44,
                height: 44,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                bgcolor: 'primary.soft',
              }}
            >
              <Iconify icon="solar:bill-list-bold" width={24} />
            </Box>
            <Box>
              <Typography variant="h6">Transaction Details</Typography>
              <Typography variant="caption" color="text.secondary">
                Purchase ID: #{selected?.id}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip value={selected?.status} />
            <IconButton onClick={() => setViewOpen(false)} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: 'background.default' }}>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Left Column: Financials & Status */}
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                {/* Financial Overview Card */}
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
                    sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Iconify icon="solar:hand-money-bold" sx={{ color: 'success.main' }} />
                    Financial Overview
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <LabeledValue label="Amount Paid">
                        <Typography component="div" variant="h5" color="text.primary">
                          INR {money(selected?.amount)}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Coins Credited">
                        <Typography variant="h5" color="info.main">
                          {selected?.coins_received ?? 0}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Payment Status">
                        <StatusChip value={selected?.payment_status} />
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Provider">
                        <Typography
                          variant="body2"
                          sx={{
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            color: 'text.secondary',
                          }}
                        >
                          {selected?.provider || 'Unknown'}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                  </Grid>
                </Box>

                {/* System IDs Card */}
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
                    sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Iconify icon="solar: Planets-bold" sx={{ color: 'primary.main' }} />
                    Tracking References
                  </Typography>

                  <Stack spacing={2}>
                    <LabeledValue label="Order ID">
                      <Typography variant="body2">{selected?.order_id || '—'}</Typography>
                    </LabeledValue>

                    <LabeledValue label="Transaction ID">
                      <Typography variant="body2">{selected?.transaction_id || '—'}</Typography>
                    </LabeledValue>

                    <LabeledValue label="Product ID">
                      <Typography variant="body2">{selected?.product_id || '—'}</Typography>
                    </LabeledValue>

                    <LabeledValue label="Purchase Token">
                      <Typography
                        variant="caption"
                        sx={{
                          wordBreak: 'break-all',
                          display: 'block',
                          color: 'text.secondary',
                          bgcolor: 'background.neutral',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {selected?.purchase_token || 'N/A'}
                      </Typography>
                    </LabeledValue>
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            {/* Right Column: User & Date Info */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* User Section */}
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}
                  >
                    Customer
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={avatarSrc(user(selected))}
                      sx={{
                        width: 56,
                        height: 56,
                        border: '2px solid #fff',
                        boxShadow: (theme) => theme.customShadows.z8,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>
                        {user(selected)?.username || `User #${selected?.user_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        ID: {selected?.user_id}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Package Info */}
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
                    variant="overline"
                    sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}
                  >
                    Item Purchased
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      variant="rounded"
                      src={packageCoverSrc(pkg(selected))}
                      sx={{ width: 48, height: 48, bgcolor: 'background.neutral' }}
                    />
                    <Box>
                      <Typography variant="subtitle2">
                        {pkg(selected)?.name || 'Coin Package'}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Pack ID: {selected?.coin_pack_id}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Date/Time info */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.darker',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:calendar-date-bold" />
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                        Created On
                      </Typography>
                      <Typography variant="body2">
                        {selected?.date
                          ? `${fDate(selected.date)} at ${fTime(selected.date)}`
                          : '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
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

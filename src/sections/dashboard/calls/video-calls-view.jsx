'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

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

import { paths } from 'src/routes/paths';

import { fDate, fTime } from 'src/utils/format-time';
import { safeJoin, avatarSrc, getSessionToken } from 'src/utils/helper';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LabeledValue from 'src/components/lables/labeled-value';
import BotSelector from 'src/components/selectors/bot-selector';
import UserSelector from 'src/components/selectors/user-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { StatusChip, CallTypeChip } from 'src/components/chip/call/video_call';

//-------------------------------------------------------------------------------------

export default function VideoCallsView() {
  const router = useRouter();
  const num = (v) => {
    if (v === null || typeof v === 'undefined') return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return String(n);
  };
  const defaultFilters = useMemo(
    () => ({
      id: '',
      chat_id: '',
      caller_id: '',
      receiver_id: '',
      call_type: '',
      status: '',
      min_duration: '',
      max_duration: '',
      min_coins: '',
      max_coins: '',
      created_from: '',
      created_to: '',
      started_from: '',
      started_to: '',
      q: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0, currentPage: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const cacheRef = useRef({});
  const [isLoading, setIsLoading] = useState(false);

  // dialogs
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [viewData, setViewData] = useState(null);

  // edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    call_type: '',
    started_at: null,
    ended_at: null,
    duration: '',
    coins_charged: '',
  });

  const buildQuery = useCallback((f, page = 1) => {
    const qp = new URLSearchParams();
    qp.set('page', String(page || 1));

    const addIf = (key, val) => {
      const v = String(val ?? '').trim();
      if (v) qp.set(key, v);
    };

    addIf('id', f.id);
    addIf('chat_id', f.chat_id);
    addIf('caller_id', f.caller_id);
    addIf('receiver_id', f.receiver_id);

    addIf('call_type', f.call_type);
    addIf('status', f.status);

    addIf('min_duration', f.min_duration);
    addIf('max_duration', f.max_duration);

    addIf('min_coins', f.min_coins);
    addIf('max_coins', f.max_coins);

    addIf('created_from', f.created_from);
    addIf('created_to', f.created_to);
    addIf('started_from', f.started_from);
    addIf('started_to', f.started_to);

    addIf('q', f.q);

    qp.set('sortBy', String(f.sortBy || 'created_at'));
    qp.set('sortOrder', String(f.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    return qp.toString();
  }, []);

  const fetchVideoCalls = useCallback(
    async (filter, page = 1, hardReload = false) => {
      const token = getSessionToken();
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

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/video-calls?${qs}`);

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
            res?.msg || res?.message || `Failed to fetch video calls (HTTP ${result.status})`
          );
          return;
        }

        const items = res?.data?.items ?? [];
        const pagApi = res?.data?.pagination ?? {};

        const pag = {
          totalItems: pagApi.totalItems ?? 0,
          totalPages: pagApi.totalPages ?? 1,
          currentPage: pagApi.currentPage ?? page,
          perPage: pagApi.perPage ?? 20,
        };

        cacheRef.current[queryKey] = { rows: items, pagination: pag };
        setRows(items);
        setPagination(pag);
      } catch (error) {
        console.error('fetchVideoCalls NETWORK error:', error);
        toast.error(`Network/CORS error. URL: ${url}`);
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, router]
  );

  const fetchOne = useCallback(
    async (id) => {
      const token = getSessionToken();
      if (!token) return null;

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/video-call?id=${encodeURIComponent(id)}`);

      const result = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
        validateStatus: () => true,
      });

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return null;
      }

      if (!res?.success) {
        toast.error(
          res?.msg || res?.message || `Failed to fetch video call (HTTP ${result.status})`
        );
        return null;
      }

      return res?.data || null;
    },
    [router]
  );

  const saveEdit = useCallback(async () => {
    if (!selected?.id) return;

    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    const payload = {
      // send only filled fields
      ...(editForm.status ? { status: editForm.status } : {}),
      ...(editForm.call_type ? { call_type: editForm.call_type } : {}),
      ...(editForm.started_at ? { started_at: dayjs(editForm.started_at).toISOString() } : {}),
      ...(editForm.ended_at ? { ended_at: dayjs(editForm.ended_at).toISOString() } : {}),
      ...(String(editForm.duration).trim() ? { duration: Number(editForm.duration) } : {}),
      ...(String(editForm.coins_charged).trim()
        ? { coins_charged: Number(editForm.coins_charged) }
        : {}),
    };

    // must have at least 1 field
    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save.');
      return;
    }

    const url = safeJoin(CONFIG.apiUrl, `v1/admin/video-call/${selected.id}`);

    try {
      const result = await axios.post(url, payload, {
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
        toast.error(res?.msg || res?.message || `Failed to update (HTTP ${result.status})`);
        return;
      }

      toast.success('Video call updated');
      setEditOpen(false);

      // refresh list hard
      cacheRef.current = {};
      fetchVideoCalls(filters, currentPage, true);

      // update view data if open
      if (viewOpen) setViewData(res?.data || null);
    } catch (e) {
      console.error('saveEdit error:', e);
      toast.error('Network error while saving');
    }
  }, [selected, editForm, router, fetchVideoCalls, filters, currentPage, viewOpen]);

  useEffect(() => {
    fetchVideoCalls(defaultFilters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    const next = {
      ...defaultFilters,
      ...filters,
      id: String(filters.id || '').trim(),
      chat_id: String(filters.chat_id || '').trim(),
      caller_id: String(filters.caller_id || '').trim(),
      receiver_id: String(filters.receiver_id || '').trim(),
      min_duration: String(filters.min_duration || '').trim(),
      max_duration: String(filters.max_duration || '').trim(),
      min_coins: String(filters.min_coins || '').trim(),
      max_coins: String(filters.max_coins || '').trim(),
      q: String(filters.q || '').trim(),
      sortBy: String(filters.sortBy || 'created_at'),
      sortOrder: String(filters.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchVideoCalls(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchVideoCalls(defaultFilters, 1, true);
  };

  const openView = async (row) => {
    setSelected(row);
    setViewOpen(true);
    setViewData(null);

    const data = await fetchOne(row.id);
    setViewData(data || row);
  };

  const openEdit = async (row) => {
    setSelected(row);
    setEditOpen(true);

    // load fresh data for form
    const data = await fetchOne(row.id);
    const r = data || row;

    setEditForm({
      status: r?.status || '',
      call_type: r?.call_type || '',
      started_at: r?.started_at ? dayjs(r.started_at) : null,
      ended_at: r?.ended_at ? dayjs(r.ended_at) : null,
      duration: typeof r?.duration === 'number' ? String(r.duration) : '',
      coins_charged: typeof r?.coins_charged === 'number' ? String(r.coins_charged) : '',
    });
  };
  const avatarLightbox = useImageLightbox();
  const caller = (r) => r?.caller || null;
  const receiver = (r) => r?.receiver || null;

  const createdAt = (r) => r?.created_at || r?.createdAt || null;
  const startedAt = (r) => r?.started_at || null;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading=" Call Records"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Video Calls', href: paths.dashboard.videoCalls?.root || '#' },
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
              fetchVideoCalls(filters, currentPage, true);
            }}
          >
            <Iconify icon="solar:refresh-bold" sx={{ width: 20, mr: 1 }} />
            Refresh
          </Button>
        </Box>
      </Box>

      <Collapse in={showFilter}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="ID"
              value={filters.id}
              onChange={(e) => setFilters((p) => ({ ...p, id: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Chat ID"
              value={filters.chat_id}
              onChange={(e) => setFilters((p) => ({ ...p, chat_id: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <UserSelector
              label="Caller"
              placeholder="Type username OR user id…"
              valueId={filters.reported_by || undefined}
              onUserSelect={(id) => setFilters((p) => ({ ...p, caller_id: id ? String(id) : '' }))}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <BotSelector
              label="Receiver Bot"
              placeholder="Type bot username OR bot id…"
              valueId={filters.reported_user || undefined}
              onBotSelect={(id) => setFilters((p) => ({ ...p, receiver_id: id ? String(id) : '' }))}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Call Type</InputLabel>
              <Select
                label="Call Type"
                value={filters.call_type ?? ''}
                onChange={(e) => setFilters((p) => ({ ...p, call_type: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="video">video</MenuItem>
                <MenuItem value="audio">audio</MenuItem>
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
                <MenuItem value="initiated">initiated</MenuItem>
                <MenuItem value="ringing">ringing</MenuItem>
                <MenuItem value="answered">answered</MenuItem>
                <MenuItem value="ended">ended</MenuItem>
                <MenuItem value="missed">missed</MenuItem>
                <MenuItem value="rejected">rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Min Duration (sec)"
              value={filters.min_duration}
              onChange={(e) => setFilters((p) => ({ ...p, min_duration: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Max Duration (sec)"
              value={filters.max_duration}
              onChange={(e) => setFilters((p) => ({ ...p, max_duration: e.target.value }))}
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

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                label="Sort By"
                value={filters.sortBy ?? 'created_at'}
                onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
              >
                <MenuItem value="created_at">created_at</MenuItem>
                <MenuItem value="started_at">started_at</MenuItem>
                <MenuItem value="ended_at">ended_at</MenuItem>
                <MenuItem value="duration">duration</MenuItem>
                <MenuItem value="coins_charged">coins_charged</MenuItem>
                <MenuItem value="status">status</MenuItem>
                <MenuItem value="call_type">call_type</MenuItem>
                <MenuItem value="id">id</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={String(filters.sortOrder || 'DESC').toUpperCase()}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    sortOrder: String(e.target.value || 'DESC').toUpperCase(),
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
              onClick={applyFilters}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
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
          <Typography sx={{ fontSize: 14 }}>Total Calls</Typography>
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
          <Iconify icon="solar:phone-calling-bold" />
        </Box>
      </Card>

      <Card>
        {isLoading ? (
          <TableSkeleton cols={9} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Caller</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Coins</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => {
                  const c = caller(row);
                  const r = receiver(row);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>

                      {/* CALLER column (avatar + full_name + email) */}
                      <TableCell>
                        {c ? (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              alt={c.full_name}
                              onClick={() => avatarLightbox.open([avatarSrc(c)], 0)}
                              src={avatarSrc(c)}
                              sx={{ width: 38, height: 38 }}
                              imgProps={{
                                onError: (e) => {
                                  e.currentTarget.src = '/assets/images/avatar_default.png';
                                },
                              }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {c.full_name || `User #${row.caller_id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {c.email || c.phone || '—'}
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              onClick={() => avatarLightbox.open([avatarSrc(c)], 0)}
                              sx={{ width: 38, height: 38 }}
                              src="/assets/images/avatar_default.png"
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                #{row.caller_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </TableCell>

                      {/* RECEIVER column (avatar + full_name + email) */}
                      <TableCell>
                        {r ? (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              alt={r.full_name}
                              onClick={() => avatarLightbox.open([avatarSrc(r)], 0)}
                              src={avatarSrc(r)}
                              sx={{ width: 38, height: 38 }}
                              imgProps={{
                                onError: (e) => {
                                  e.currentTarget.src = '/assets/images/avatar_default.png';
                                },
                              }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {r.full_name || `User #${row.receiver_id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {r.email || r.phone || '—'}
                              </Typography>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              onClick={() => avatarLightbox.open([avatarSrc(c)], 0)}
                              sx={{ width: 38, height: 38 }}
                              src="/assets/images/avatar_default.png"
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                #{row.receiver_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </TableCell>

                      <TableCell>
                        <CallTypeChip value={row.call_type} />
                      </TableCell>

                      <TableCell>
                        <StatusChip value={row.status} />
                      </TableCell>

                      <TableCell>{num(row.coins_charged)}</TableCell>
                      <TableCell>{row.duration != null ? `${row.duration}s` : '—'}</TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                        <ListItemText
                          primary={createdAt(row) ? fDate(createdAt(row)) : '—'}
                          secondary={createdAt(row) ? fTime(createdAt(row)) : ''}
                          primaryTypographyProps={{ typography: 'body2' }}
                          secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                        />
                      </TableCell>

                      {/* ACTIONS: View + Edit */}
                      <TableCell align="right">
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Tooltip title="View">
                            <IconButton size="small" color="primary" onClick={() => openView(row)}>
                              <Iconify icon="solar:eye-bold" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit">
                            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
                              <Iconify icon="solar:pen-bold" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
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
            fetchVideoCalls(filters, p, true);
          }}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* VIEW DIALOG */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
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
              <Iconify icon="solar:phone-calling-bold" width={24} />
            </Box>
            <Box>
              <Typography variant="h6">Call Details</Typography>
              <Typography variant="caption" color="text.secondary">
                Call ID: #{selected?.id}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip value={viewData?.status || selected?.status} />
            <IconButton onClick={() => setViewOpen(false)} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={2.5}>
                <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Call Info
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <LabeledValue label="Type">
                        <CallTypeChip value={viewData?.call_type || selected?.call_type} />
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Status">
                        <StatusChip value={viewData?.status || selected?.status} />
                      </LabeledValue>
                    </Grid>

                    <Grid item xs={6}>
                      <LabeledValue label="Coins Charged">
                        <Typography variant="body2">
                          {num(viewData?.coins_charged ?? selected?.coins_charged)}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                    <Grid item xs={6}>
                      <LabeledValue label="Duration">
                        <Typography variant="body2">
                          {(viewData?.duration ?? selected?.duration) != null
                            ? `${viewData?.duration ?? selected?.duration}s`
                            : '—'}
                        </Typography>
                      </LabeledValue>
                    </Grid>

                    <Grid item xs={6}>
                      <LabeledValue label="Started At">
                        <Typography variant="body2">
                          {startedAt(viewData || selected)
                            ? `${fDate(startedAt(viewData || selected))} ${fTime(startedAt(viewData || selected))}`
                            : '—'}
                        </Typography>
                      </LabeledValue>
                    </Grid>

                    <Grid item xs={6}>
                      <LabeledValue label="Created At">
                        <Typography variant="body2">
                          {createdAt(viewData || selected)
                            ? `${fDate(createdAt(viewData || selected))} ${fTime(createdAt(viewData || selected))}`
                            : '—'}
                        </Typography>
                      </LabeledValue>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={2.5}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}
                  >
                    Caller
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={avatarSrc(caller(viewData || selected))}
                      sx={{ width: 56, height: 56 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>
                        {caller(viewData || selected)?.full_name ||
                          `User #${(viewData || selected)?.caller_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {caller(viewData || selected)?.email ||
                          caller(viewData || selected)?.phone ||
                          '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}
                  >
                    Receiver
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={avatarSrc(receiver(viewData || selected))}
                      sx={{ width: 56, height: 56 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>
                        {receiver(viewData || selected)?.full_name ||
                          `User #${(viewData || selected)?.receiver_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {receiver(viewData || selected)?.email ||
                          receiver(viewData || selected)?.phone ||
                          '—'}
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

      {/* EDIT DIALOG */}
      <Dialog
        fullWidth
        maxWidth="sm"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, bgcolor: 'background.neutral' }}>
          <Typography component="div" variant="h6">
            Edit Call
          </Typography>
          <Typography component="div" variant="caption" color="text.secondary">
            Call ID: #{selected?.id}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4, overflowY: 'visible' }}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel shrink sx={{ px: 0.5, bgcolor: 'background.paper' }}>
                  Status
                </InputLabel>
                <Select
                  label="Status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  displayEmpty
                  sx={{
                    borderRadius: 2,
                    '& .MuiSelect-select': {
                      py: 1.8,
                      px: 2,
                    },
                  }}
                >
                  {[
                    { val: '', pri: 'No change', sec: 'Keep current status' },
                    { val: 'initiated', pri: 'Initiated', sec: 'Created but not ringing yet' },
                    { val: 'ringing', pri: 'Ringing', sec: 'Ringing / waiting for answer' },
                    { val: 'answered', pri: 'Answered', sec: 'Call was answered' },
                    { val: 'ended', pri: 'Ended', sec: 'Call ended normally' },
                    { val: 'missed', pri: 'Missed', sec: 'Receiver didn’t answer' },
                    { val: 'rejected', pri: 'Rejected', sec: 'Receiver rejected the call' },
                  ].map((item) => (
                    <MenuItem key={item.val} value={item.val} sx={{ py: 1.2, px: 2 }}>
                      <ListItemText
                        primary={item.pri}
                        secondary={item.sec}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: item.val === '' ? 700 : 500,
                        }}
                        secondaryTypographyProps={{ variant: 'caption' }} // Smaller secondary text to prevent menu bloating
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setEditOpen(false)}
            sx={{ px: 4 }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={saveEdit} sx={{ px: 4 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

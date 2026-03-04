'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { toast } from 'react-toastify';
import timezone from 'dayjs/plugin/timezone';
import { useRef, useState, useEffect, useCallback } from 'react';

import { alpha } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Timeline,
  TimelineDot,
  TimelineItem,
  TimelineContent,
  TimelineSeparator,
  TimelineConnector,
} from '@mui/lab';
import {
  Box,
  Card,
  Grid,
  Table,
  Stack,
  Slide,
  Paper,
  Button,
  Select,
  Dialog,
  Avatar,
  Tooltip,
  Divider,
  MenuItem,
  TableRow,
  Collapse,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  IconButton,
  Pagination,
  InputLabel,
  Typography,
  FormControl,
  DialogTitle,
  ListItemText,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { fDate, fTime } from 'src/utils/format-time';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';
import { safeJoin, getCookie, formatDateTime, queryStringFrom } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LoadingPopup from 'src/components/popup/loading-popup';
import BotSelector from 'src/components/selectors/bot-selector';
import UserSelector from 'src/components/selectors/user-selector';
import AdminSelector from 'src/components/selectors/admin-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { statusLabel, statusColor } from 'src/components/chip/report/report-chip';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ReportsView() {
  const session_key = getCookie('session_key');

  const API_ROOT = String(CONFIG.apiUrl || '').replace(/\/+$/, '');
  const baseUrl = `${API_ROOT}/v1/admin`;

  const defaultFilters = {
    id: '',
    status: '',
    reported_user: '',
    reported_by: '',
    moderated_by: '',
    moderated_from: '',
    moderated_to: '',
    created_from: '',
    created_to: '',
    orderBy: 'created_at',
    order: 'DESC',
    perPage: 20,
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [resetFilters, setResetFilters] = useState(1);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 20,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const cacheRef = useRef({});

  //  profile caches
  const [userMap, setUserMap] = useState({});
  const [botMap, setBotMap] = useState({});
  const [adminMap, setAdminMap] = useState({});

  const userCacheRef = useRef({});
  const botCacheRef = useRef({});
  const adminCacheRef = useRef({});

  //  dialogs
  const [selectedRow, setSelectedRow] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);

  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: 'pending',
    moderator_note: '',
  });

  //  Assign dialog
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [assignAdminId, setAssignAdminId] = useState('');
  const [assignAdminObj, setAssignAdminObj] = useState(null);

  const canUpdate = (row) => !!row?.id && !!row?.reported_user;

  // ---------- Headers ----------
  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${session_key}`,
      'Content-Type': 'application/json',
    }),
    [session_key]
  );

  const pickName = (u) => u?.full_name || u?.name || u?.username || `#${u?.id || ''}`;
  const pickEmail = (u) => u?.email || '';

  //  unify API return shapes
  const pickApiEntity = (result) =>
    result?.data?.user ||
    result?.data?.bot ||
    result?.data?.admin ||
    result?.data?.profile ||
    result?.data ||
    result?.user ||
    result?.bot ||
    result?.admin ||
    null;

  //  avatar resolver (bots + users are stored in uploads/avatar/user/)
  function avatarSrc(entity) {
    const av = entity?.avatar || entity?.profile_image || '';

    if (!av) return '';
    if (/^https?:\/\//i.test(String(av))) return String(av);

    const cleaned = String(av).replaceAll('\\', '/').replace(/^\/+/, '');

    if (cleaned.startsWith('uploads/')) return safeJoin(CONFIG.assetsUrl, cleaned);

    // fallback: filename only
    return safeJoin(CONFIG.assetsUrl, `uploads/avatar/user/${cleaned}`);
  }

  function adminAvatarSrc(admin) {
    const av = admin?.avatar || admin?.profile_image || admin?.avatar_url || '';
    if (!av) return '';

    if (/^https?:\/\//i.test(String(av))) return String(av);

    const cleaned = String(av).replaceAll('\\', '/').replace(/^\/+/, '');

    if (cleaned.startsWith('uploads/')) return safeJoin(CONFIG.assetsUrl, cleaned);

    return safeJoin(CONFIG.assetsUrl, `uploads/avatar/admin/${cleaned}`);
  }

  // ---------- Query builder ----------
  const buildQueryForApi = (filter, page) => {
    const q = {
      id: filter.id ? Number(filter.id) : '',
      status: filter.status || '',
      reported_user: filter.reported_user ? Number(filter.reported_user) : '',
      reported_by: filter.reported_by ? Number(filter.reported_by) : '',
      moderated_by: filter.moderated_by ? Number(filter.moderated_by) : '',

      created_from: filter.created_from || '',
      created_to: filter.created_to || '',
      moderated_from: filter.moderated_from || '',
      moderated_to: filter.moderated_to || '',

      page,
      perPage: Number(filter.perPage) || 20,
      orderBy: filter.orderBy || 'created_at',
      order: filter.order || 'DESC',
    };

    Object.keys(q).forEach((k) => {
      if (q[k] === '' || q[k] === null || typeof q[k] === 'undefined') delete q[k];
    });

    return q;
  };

  // ----------------------------------------------------------------------
  // Fetch user / bot / admin by ID (cached)

  const fetchUserById = useCallback(
    async (id) => {
      const userId = Number(id);
      if (!Number.isFinite(userId) || userId <= 0) return;

      if (userCacheRef.current[userId]) return;
      userCacheRef.current[userId] = { _loading: true };

      const url = `${baseUrl}/users/${userId}`;

      try {
        const res = await axios.get(url, { headers: authHeaders(), validateStatus: () => true });
        const result = res.data;

        if (!result?.success) {
          userCacheRef.current[userId] = { _missing: true };
          return;
        }

        const user = pickApiEntity(result);
        if (user?.id) {
          userCacheRef.current[userId] = user;
          setUserMap((prev) => ({ ...prev, [userId]: user }));
        } else {
          userCacheRef.current[userId] = { _missing: true };
        }
      } catch (e) {
        userCacheRef.current[userId] = { _missing: true };
      }
    },
    [authHeaders, baseUrl]
  );

  const fetchBotById = useCallback(
    async (id) => {
      const botId = Number(id);
      if (!Number.isFinite(botId) || botId <= 0) return;

      if (botCacheRef.current[botId]) return;
      botCacheRef.current[botId] = { _loading: true };

      const tryFetch = async (url) => {
        const res = await axios.get(url, { headers: authHeaders(), validateStatus: () => true });
        return { ok: !!res.data?.success, data: res.data };
      };

      try {
        let out = await tryFetch(`${baseUrl}/bots/${botId}`);
        if (!out.ok) out = await tryFetch(`${baseUrl}/users/${botId}`);

        if (!out.ok) {
          botCacheRef.current[botId] = { _missing: true };
          return;
        }

        const bot = pickApiEntity(out.data);
        if (bot?.id) {
          botCacheRef.current[botId] = bot;
          setBotMap((prev) => ({ ...prev, [botId]: bot }));
        } else {
          botCacheRef.current[botId] = { _missing: true };
        }
      } catch (e) {
        botCacheRef.current[botId] = { _missing: true };
      }
    },
    [authHeaders, baseUrl]
  );

  function stripHtmlToText(html) {
    const s = String(html || '').trim();
    if (!s) return '';

    // remove scripts/styles
    const noScript = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    const noStyle = noScript.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

    // keep line breaks for <br> and </p>
    const withBreaks = noStyle
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<\/div\s*>/gi, '\n');

    // strip tags
    const text = withBreaks.replace(/<[^>]+>/g, '');

    // decode basic entities
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  //  /v1/admin/manage-admins/:id
  const fetchAdminById = useCallback(
    async (id) => {
      const adminId = Number(id);
      if (!Number.isFinite(adminId) || adminId <= 0) return;

      if (adminCacheRef.current[adminId]) return;
      adminCacheRef.current[adminId] = { _loading: true };

      const url = `${baseUrl}/manage-admins/${adminId}`;

      try {
        const res = await axios.get(url, { headers: authHeaders(), validateStatus: () => true });
        const result = res.data;

        if (!result?.success) {
          adminCacheRef.current[adminId] = { _missing: true };
          return;
        }

        const admin = pickApiEntity(result);

        if (admin?.id) {
          adminCacheRef.current[adminId] = admin;
          setAdminMap((prev) => ({ ...prev, [adminId]: admin }));
        } else {
          adminCacheRef.current[adminId] = { _missing: true };
        }
      } catch (e) {
        adminCacheRef.current[adminId] = { _missing: true };
      }
    },
    [authHeaders, baseUrl]
  );

  const ensureProfilesForRows = useCallback(
    async (reportRows) => {
      const userIds = new Set();
      const botIds = new Set();
      const adminIds = new Set();

      (reportRows || []).forEach((r) => {
        if (r?.reported_by) userIds.add(Number(r.reported_by));
        if (r?.reported_user) botIds.add(Number(r.reported_user));
        if (r?.moderated_by) adminIds.add(Number(r.moderated_by));
      });

      await Promise.all([
        ...Array.from(userIds).map((id) => fetchUserById(id)),
        ...Array.from(botIds).map((id) => fetchBotById(id)),
        ...Array.from(adminIds).map((id) => fetchAdminById(id)),
      ]);
    },
    [fetchAdminById, fetchBotById, fetchUserById]
  );

  // ----------------------------------------------------------------------
  // Reports fetch

  const fetchReports = useCallback(
    async (filter, page = 1, hardReload = false) => {
      setLoading(true);

      const queryObj = buildQueryForApi(filter, page);
      const queryKey = queryStringFrom(queryObj);

      if (cacheRef.current[queryKey] && !hardReload) {
        const cached = cacheRef.current[queryKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        setLoading(false);
        ensureProfilesForRows(cached.rows);
        return;
      }

      const url = `${baseUrl}/reports?${queryKey}`;

      try {
        const res = await axios.get(url, { headers: authHeaders(), validateStatus: () => true });
        const result = res.data;

        if (!result?.success) {
          toast.error(
            result?.message ||
              result?.msg ||
              result?.error ||
              `Failed to fetch reports (HTTP ${res.status})`
          );

          setRows([]);
          setPagination({
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            perPage: queryObj.perPage || 20,
          });
          return;
        }

        const r = result?.data?.reports ?? [];
        const pag = result?.data?.pagination ?? {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          perPage: queryObj.perPage || 20,
        };

        setRows(r);
        setPagination(pag);
        cacheRef.current[queryKey] = { rows: r, pagination: pag };

        ensureProfilesForRows(r);
      } catch (err) {
        toast.error('Error while loading reports.');
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, baseUrl, ensureProfilesForRows]
  );

  useEffect(() => {
    fetchReports(defaultFilters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------
  // Handlers

  const handleFilterApply = () => {
    setCurrentPage(1);
    cacheRef.current = {};
    fetchReports(filters, 1, true);
  };

  const handleFilterReset = () => {
    setCurrentPage(1);
    setFilters(defaultFilters);
    cacheRef.current = {};
    setResetFilters((x) => x + 1);
    fetchReports(defaultFilters, 1, true);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    fetchReports(filters, p);
  };

  const openViewFor = (row) => {
    setSelectedRow(row);
    setOpenViewDialog(true);
  };

  const openUpdateFor = (row) => {
    if (!canUpdate(row)) {
      toast.error('Cannot update this report (missing botId / reportId).');
      return;
    }

    setSelectedRow(row);
    setUpdateForm({
      status: String(row?.status || 'pending'),
      moderator_note: stripHtmlToText(row?.moderator_note) || '',
    });
    setOpenUpdateDialog(true);
  };

  //  Assign flow
  const openAssignFor = (row) => {
    if (!canUpdate(row)) {
      toast.error('Cannot assign this report (missing botId / reportId).');
      return;
    }

    setSelectedRow(row);

    const existing = row?.moderated_by ? String(row.moderated_by) : '';
    setAssignAdminId(existing);
    setAssignAdminObj(existing ? adminMap?.[Number(existing)] || null : null);

    setOpenAssignDialog(true);
  };

  // ----------------------------------------------------------------------
  // Update report

  const handleUpdateReport = async () => {
    if (!selectedRow?.id || !selectedRow?.reported_user) return;

    const status = String(updateForm.status || '').trim();
    if (!status) {
      toast.error('Status is required.');
      return;
    }
    const cleanNote = stripHtmlToText(updateForm.moderator_note);

    setActionLoading(true);
    try {
      const url = `${baseUrl}/bots/${Number(selectedRow.reported_user)}/reports/${Number(
        selectedRow.id
      )}`;

      const res = await axios.post(
        url,
        { status, moderator_note: cleanNote || null },
        { headers: authHeaders(), validateStatus: () => true }
      );

      const result = res.data;

      if (result?.success) {
        toast.success(result?.message || 'Report updated successfully.');
        setOpenUpdateDialog(false);

        const updated = result?.data?.report;
        if (updated?.id) {
          setRows((prev) =>
            prev.map((r) => (Number(r.id) === Number(updated.id) ? { ...r, ...updated } : r))
          );

          if (updated?.moderated_by) fetchAdminById(updated.moderated_by);
        }

        cacheRef.current = {};
        fetchReports(filters, currentPage, true);
      } else {
        toast.error(result?.message || 'Failed to update report');
      }
    } catch (err) {
      toast.error('Error while updating report.');
    } finally {
      setActionLoading(false);
    }
  };

  //  Assign Admin (uses same update endpoint)
  const handleAssignAdmin = async () => {
    if (!selectedRow?.id || !selectedRow?.reported_user) return;

    const adminId = Number(assignAdminId);
    if (!Number.isFinite(adminId) || adminId <= 0) {
      toast.error('Please choose a valid admin to assign.');
      return;
    }

    setActionLoading(true);
    try {
      const url = `${baseUrl}/bots/${Number(selectedRow.reported_user)}/reports/${Number(
        selectedRow.id
      )}`;

      // send current values + moderated_by (backend can accept it)
      const body = {
        status: String(selectedRow?.status || 'pending'),
        moderator_note: selectedRow?.moderator_note || null,
        moderated_by: adminId,
      };

      const res = await axios.post(url, body, {
        headers: authHeaders(),
        validateStatus: () => true,
      });

      const result = res.data;

      if (!result?.success) {
        toast.error(result?.message || 'Failed to assign admin');
        return;
      }

      toast.success(result?.message || 'Admin assigned successfully.');

      // Prefer server-returned report if available
      const updated = result?.data?.report || null;

      setRows((prev) =>
        prev.map((r) => {
          if (Number(r.id) !== Number(selectedRow.id)) return r;

          if (updated?.id) return { ...r, ...updated };

          // fallback optimistic update
          return {
            ...r,
            moderated_by: adminId,
            moderated_at: r?.moderated_at || new Date().toISOString(),
          };
        })
      );

      // load admin profile so cell shows avatar/name/email
      await fetchAdminById(adminId);

      setOpenAssignDialog(false);

      // refresh cache
      cacheRef.current = {};
      fetchReports(filters, currentPage, true);
    } catch (err) {
      toast.error('Error while assigning admin.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Cells

  const BotCell = ({ botId }) => {
    const b = botId ? botMap?.[Number(botId)] : null;

    const name = b ? pickName(b) : botId ? `#${botId}` : '—';
    const email = b ? pickEmail(b) : '';
    const img = b ? avatarSrc(b) : '';

    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          src={img}
          onClick={() => avatarLightbox.open([img], 0)}
          alt={name}
          imgProps={{
            onError: (e) => {
              e.currentTarget.src = '/assets/images/avatar_default.png';
            },
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {email || (botId ? `Bot ID: #${botId}` : '—')}
          </Typography>
        </Box>
      </Stack>
    );
  };

  const UserCell = ({ userId }) => {
    const u = userId ? userMap?.[Number(userId)] : null;

    const name = u ? pickName(u) : userId ? `#${userId}` : '—';
    const email = u ? pickEmail(u) : '';
    const img = u ? avatarSrc(u) : '';

    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          src={img}
          onClick={() => avatarLightbox.open([img], 0)}
          alt={name}
          imgProps={{
            onError: (e) => {
              e.currentTarget.src = '/assets/images/avatar_default.png';
            },
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {email || (userId ? `User ID: #${userId}` : '—')}
          </Typography>
        </Box>
      </Stack>
    );
  };
  const avatarLightbox = useImageLightbox();
  const AdminCell = ({ adminId }) => {
    const a = adminId ? adminMap?.[Number(adminId)] : null;

    const username = a?.username || (adminId ? `#${adminId}` : '—');
    const email = a ? pickEmail(a) : '';
    const img = a ? adminAvatarSrc(a) : '';

    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          onClick={() => avatarLightbox.open([img], 0)}
          src={img}
          alt={username}
          imgProps={{
            onError: (e) => {
              e.currentTarget.src = '/assets/images/avatar_default.png';
            },
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {username}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {email || (adminId ? `Admin ID: #${adminId}` : '—')}
          </Typography>
        </Box>
      </Stack>
    );
  };

  // ----------------------------------------------------------------------
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CustomBreadcrumbs
            heading="Reports Management"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Reports' }]}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1, mr: '10px', mb: '16px' }}>
            <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
              <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
              {showFilter ? 'Hide Filter' : 'Show Filter'}
            </Button>
          </Box>
        </Box>

        {/* -----------------filter */}
        <Collapse in={showFilter} timeout="auto">
          <Grid container spacing={2} alignItems="center" key={resetFilters}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Report ID"
                placeholder="Type report id…"
                value={filters.id || ''}
                onChange={(e) => {
                  // allow only numbers
                  const v = String(e.target.value || '').replace(/\D/g, '');
                  setFilters((p) => ({ ...p, id: v }));
                }}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="spam">Spam</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <BotSelector
                label="Reported Bot"
                placeholder="Type bot username OR bot id…"
                valueId={filters.reported_user || undefined}
                onBotSelect={(id) =>
                  setFilters((p) => ({ ...p, reported_user: id ? String(id) : '' }))
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <UserSelector
                label="Reported By (User)"
                placeholder="Type username OR user id…"
                valueId={filters.reported_by || undefined}
                onUserSelect={(id) =>
                  setFilters((p) => ({ ...p, reported_by: id ? String(id) : '' }))
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AdminSelector
                label="Moderated By (Admin)"
                placeholder="Type username OR admin id…"
                valueId={filters.moderated_by || undefined}
                onAdminSelect={(id) =>
                  setFilters((p) => ({ ...p, moderated_by: id ? String(id) : '' }))
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Created From"
                value={filters.created_from ? dayjs(filters.created_from) : null}
                onChange={(v) =>
                  setFilters((p) => ({ ...p, created_from: v ? v.toISOString() : '' }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Created To"
                value={filters.created_to ? dayjs(filters.created_to) : null}
                onChange={(v) =>
                  setFilters((p) => ({ ...p, created_to: v ? v.toISOString() : '' }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.orderBy}
                  label="Sort By"
                  onChange={(e) => setFilters((p) => ({ ...p, orderBy: e.target.value }))}
                >
                  <MenuItem value="id">ID</MenuItem>
                  <MenuItem value="created_at">Created</MenuItem>
                  <MenuItem value="moderated_at">Moderated</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={filters.order}
                  label="Order"
                  onChange={(e) => setFilters((p) => ({ ...p, order: e.target.value }))}
                >
                  <MenuItem value="ASC">Ascending</MenuItem>
                  <MenuItem value="DESC">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6} sx={{ gap: 1, display: 'flex' }}>
              <Button variant="contained" onClick={handleFilterApply} sx={{ height: 50, flex: 1 }}>
                Apply
              </Button>
              <Button variant="outlined" onClick={handleFilterReset} sx={{ height: 50, flex: 1 }}>
                Reset
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
            <Typography sx={{ fontSize: 14 }}>Total Reports</Typography>
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
              bgcolor: '#dc2626',
              color: '#fff',
            }}
          >
            <Iconify icon="mdi:alert-circle" />
          </Box>
        </Card>

        {/* TABLE */}
        <Card>
          {isLoading ? (
            <TableSkeleton cols={10} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Reported Bot</TableCell>
                    <TableCell>Reported By</TableCell>
                    <TableCell>Moderated By</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ textWrap: 'nowrap' }}>Created</TableCell>
                    <TableCell sx={{ textWrap: 'nowrap' }}>Moderated At</TableCell>
                    <TableCell>Moderator Note</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>

                      <TableCell>
                        <BotCell botId={row?.reported_user} />
                      </TableCell>

                      <TableCell>
                        <UserCell userId={row?.reported_by} />
                      </TableCell>

                      <TableCell sx={{ minWidth: 240 }}>
                        {row?.moderated_by ? <AdminCell adminId={row.moderated_by} /> : '—'}
                      </TableCell>

                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" noWrap>
                          {row?.reason || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Label variant="soft" color={statusColor(row.status)}>
                          {statusLabel(row.status)}
                        </Label>
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                        <ListItemText
                          primary={row.created_at ? fDate(row.created_at) : '—'}
                          secondary={row.created_at ? fTime(row.created_at) : ''}
                          primaryTypographyProps={{ typography: 'body2' }}
                          secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                        />
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                        <ListItemText
                          primary={row?.moderated_at ? fDate(row.moderated_at) : '—'}
                          secondary={row?.moderated_at ? fTime(row.moderated_at) : ''}
                          primaryTypographyProps={{ typography: 'body2' }}
                          secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{
                            display: 'block',
                            maxWidth: 260,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row?.moderator_note || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center">
                          <Tooltip title="View" placement="top" arrow>
                            <IconButton color="primary" onClick={() => openViewFor(row)}>
                              <Iconify icon="mdi:eye" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Update" placement="top" arrow>
                            <span>
                              <IconButton
                                color="info"
                                disabled={!canUpdate(row)}
                                onClick={() => openUpdateFor(row)}
                              >
                                <Iconify icon="mdi:file-edit" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Assign Admin" placement="top" arrow>
                            <span>
                              <IconButton
                                color="secondary"
                                disabled={!canUpdate(row)}
                                onClick={() => openAssignFor(row)}
                              >
                                <Iconify icon="mdi:account-arrow-right" />
                              </IconButton>
                            </span>
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

        <Stack sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', m: 2 }}>
          <Pagination
            count={pagination?.totalPages || 0}
            page={currentPage}
            onChange={(_, p) => handlePageChange(p)}
            renderItem={(item) => <PaginationItem {...item} />}
          />
        </Stack>

        {/* VIEW DIALOG */}
        <Dialog
          open={openViewDialog}
          onClose={() => setOpenViewDialog(false)}
          fullWidth
          maxWidth="md"
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: (theme) => theme.shadows[20],
            },
          }}
        >
          {/* Header with Dynamic Background based on Status */}
          <DialogTitle
            sx={{
              p: 3,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              bgcolor: (theme) =>
                selectedRow?.status === 'pending'
                  ? alpha(theme.palette.warning.lighter, 0.4)
                  : selectedRow?.status === 'spam'
                    ? alpha(theme.palette.error.lighter, 0.4)
                    : selectedRow?.status === 'completed'
                      ? alpha(theme.palette.success.lighter, 0.4)
                      : 'background.neutral',
            }}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Report #{selectedRow?.id}
                </Typography>
                <Label
                  variant="filled"
                  color={statusColor(selectedRow?.status)}
                  sx={{ textTransform: 'uppercase', fontWeight: 700 }}
                >
                  {statusLabel(selectedRow?.status)}
                </Label>
              </Stack>
              <Typography variant="body2">
                Submitted on {selectedRow?.created_at ? fDate(selectedRow.created_at) : '—'} at{' '}
                {selectedRow?.created_at ? fTime(selectedRow.created_at) : ''}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpenViewDialog(false)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="mdi:close" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {selectedRow ? (
              <Grid container spacing={3}>
                {/* LEFT COLUMN: The "Story" (Reason & Notes) */}
                <Grid item xs={12} md={7}>
                  <Stack spacing={3}>
                    {/* The Issue / Reason */}
                    <Paper
                      variant="outlined"
                      sx={{ p: 2.5, borderRadius: 2, borderColor: 'divider', mt: 2 }}
                    >
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        Report Reason
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                        {selectedRow.reason || 'No specific reason provided.'}
                      </Typography>
                    </Paper>

                    {/* Profiles Involved */}
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Entities Involved
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      {/* Reported Bot Card */}
                      <Card
                        sx={{
                          flex: 1,
                          p: 2,
                          border: (theme) => `1px dashed ${theme.palette.divider}`,
                          boxShadow: 'none',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 2,
                          }}
                        >
                          <Iconify icon="mdi:robot" width={16} /> REPORTED BOT
                        </Typography>
                        <BotCell botId={selectedRow.reported_user} />
                      </Card>

                      {/* Reported By User Card */}
                      <Card
                        sx={{
                          flex: 1,
                          p: 2,
                          border: (theme) => `1px dashed ${theme.palette.divider}`,
                          boxShadow: 'none',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="info.main"
                          sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 2,
                          }}
                        >
                          <Iconify icon="mdi:account" width={16} /> REPORTER
                        </Typography>
                        <UserCell userId={selectedRow.reported_by} />
                      </Card>
                    </Stack>

                    {/* Moderator Note (If exists) */}
                    {selectedRow.moderator_note && (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                          Moderator Notes
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: 'warning.lighter', color: 'warning.darker' }}>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            "{selectedRow.moderator_note}"
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                {/* RIGHT COLUMN: Metadata & Timeline */}
                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      p: 2.5,
                      bgcolor: 'background.neutral',
                      borderRadius: 2,
                      height: '100%',
                      mt: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5 }}>
                      Investigation Details
                    </Typography>

                    {/* Timeline */}
                    <Timeline
                      // FIX 2: Used explicit string instead of timelineItemClasses
                      sx={{
                        [`& .MuiTimelineItem-root:before`]: { flex: 0, padding: 0 },
                        p: 0,
                        m: 0,
                      }}
                    >
                      {/* Created Step */}
                      <TimelineItem>
                        <TimelineSeparator>
                          <TimelineDot
                            color="primary"
                            sx={{ width: 12, height: 12, boxShadow: 'none' }}
                          />
                          <TimelineConnector sx={{ bgcolor: 'divider' }} />
                        </TimelineSeparator>
                        <TimelineContent sx={{ pb: 3, pt: 0.5 }}>
                          <Typography variant="subtitle2">Report Created</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(selectedRow.created_at)}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>

                      {/* Moderated Step (Conditional) */}
                      <TimelineItem>
                        <TimelineSeparator>
                          <TimelineDot
                            color={selectedRow.moderated_at ? 'success' : 'grey'}
                            variant={selectedRow.moderated_at ? 'filled' : 'outlined'}
                            sx={{ width: 12, height: 12, boxShadow: 'none' }}
                          />
                          {selectedRow.updated_at && (
                            <TimelineConnector sx={{ bgcolor: 'divider' }} />
                          )}
                        </TimelineSeparator>
                        <TimelineContent sx={{ pb: 3, pt: 0.5 }}>
                          <Typography
                            variant="subtitle2"
                            color={!selectedRow.moderated_at ? 'text.disabled' : 'text.primary'}
                          >
                            {selectedRow.status === 'pending'
                              ? 'Pending Review'
                              : 'Moderation Action'}
                          </Typography>
                          {selectedRow.moderated_at ? (
                            <>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatDateTime(selectedRow.moderated_at)}
                              </Typography>
                              {selectedRow.moderated_by && (
                                <Box
                                  sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}
                                >
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mb: 0.5, fontWeight: 700 }}
                                  >
                                    BY ADMIN
                                  </Typography>
                                  <AdminCell adminId={selectedRow.moderated_by} />
                                </Box>
                              )}
                            </>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              Awaiting action...
                            </Typography>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    </Timeline>

                    <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}
                    >
                      LAST UPDATE
                    </Typography>
                    <Typography variant="body2">
                      {selectedRow.updated_at ? formatDateTime(selectedRow.updated_at) : '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No report loaded.
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions
            sx={{ p: 2.5, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Button
              onClick={() => setOpenViewDialog(false)}
              variant="outlined"
              color="inherit"
              size="large"
            >
              Close
            </Button>
            {selectedRow && canUpdate(selectedRow) && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Iconify icon="mdi:file-edit" />}
                onClick={() => {
                  setOpenViewDialog(false);
                  openUpdateFor(selectedRow);
                }}
              >
                Take Action
              </Button>
            )}
          </DialogActions>
        </Dialog>
        {/* UPDATE DIALOG */}
        {/* UPDATE DIALOG (Improved UI) */}
        <Dialog
          open={openUpdateDialog}
          onClose={() => setOpenUpdateDialog(false)}
          fullWidth
          maxWidth="sm"
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: (theme) => theme.shadows[24],
            },
          }}
        >
          {/* --- HEADER --- */}
          <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                width: 48,
                height: 48,
              }}
            >
              <Iconify icon="mdi:file-document-edit-outline" width={24} />
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Update Report Status
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Report #{selectedRow?.id}
                </Typography>
                <Label color={statusColor(selectedRow?.status)} variant="soft" sx={{ height: 22 }}>
                  Current: {statusLabel(selectedRow?.status)}
                </Label>
              </Stack>
            </Box>

            <IconButton onClick={() => setOpenUpdateDialog(false)}>
              <Iconify icon="mdi:close" />
            </IconButton>
          </DialogTitle>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              {/* --- 1. REASON DISPLAY (THE "WHOLE REASON") --- */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Iconify
                    icon="mdi:text-box-outline"
                    width={18}
                    sx={{ color: 'text.secondary' }}
                  />
                  Reported Reason
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                    border: (theme) => `1px dashed ${theme.palette.divider}`,
                    maxHeight: 200, // Keeps dialog size manageable if text is huge
                    overflowY: 'auto', // Scroll only if content exceeds 200px
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap', // Preserves newlines and wraps text
                      wordBreak: 'break-word', // Prevents long words/links from overflowing
                      color: 'text.primary',
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedRow?.reason || 'No specific reason provided.'}
                  </Typography>
                </Paper>
              </Box>

              {/* --- 2. INPUT FIELDS --- */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Action Required
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>New Status</InputLabel>
                    <Select
                      value={updateForm.status}
                      label="New Status"
                      onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Label variant="soft" color={statusColor(selected)}>
                            {statusLabel(selected)}
                          </Label>
                        </Box>
                      )}
                    >
                      <MenuItem value="pending">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Label
                            color="warning"
                            variant="soft"
                            sx={{ width: 80, justifyContent: 'center' }}
                          >
                            Pending
                          </Label>
                          <Typography variant="body2">Under Review</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="spam">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Label
                            color="error"
                            variant="soft"
                            sx={{ width: 80, justifyContent: 'center' }}
                          >
                            Spam
                          </Label>
                          <Typography variant="body2">Mark as Spam</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="rejected">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Label
                            color="info"
                            variant="soft"
                            sx={{ width: 80, justifyContent: 'center' }}
                          >
                            Rejected
                          </Label>
                          <Typography variant="body2">Invalid Report</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="completed">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Label
                            color="success"
                            variant="soft"
                            sx={{ width: 80, justifyContent: 'center' }}
                          >
                            Completed
                          </Label>
                          <Typography variant="body2">Resolved / Action Taken</Typography>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1, mb: 0.5, display: 'block' }}
                    >
                      Moderator Note (Internal)
                    </Typography>
                    <Editor
                      value={updateForm.moderator_note}
                      onChange={(value) => setUpdateForm((p) => ({ ...p, moderator_note: value }))}
                      placeholder="Add details about the investigation or action taken..."
                      sx={{
                        maxHeight: 200,
                        overflow: 'auto',
                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          {/* --- FOOTER --- */}
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button
              size="large"
              variant="outlined"
              color="inherit"
              onClick={() => setOpenUpdateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="large"
              variant="contained"
              onClick={handleUpdateReport}
              disabled={actionLoading}
              startIcon={
                actionLoading ? (
                  <Iconify icon="eos-icons:loading" />
                ) : (
                  <Iconify icon="mdi:content-save-check" />
                )
              }
            >
              {actionLoading ? 'Saving...' : 'Update Report'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ASSIGN DIALOG */}
        {/* ASSIGN DIALOG */}
        <Dialog
          open={openAssignDialog}
          onClose={() => setOpenAssignDialog(false)}
          fullWidth
          maxWidth="sm"
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: (theme) => theme.shadows[24],
            },
          }}
        >
          <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                color: 'info.main',
                width: 48,
                height: 48,
              }}
            >
              <Iconify icon="mdi:account-arrow-right-outline" width={24} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Assign Investigation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Delegate Report #{selectedRow?.id}
              </Typography>
            </Box>
            <IconButton onClick={() => setOpenAssignDialog(false)}>
              <Iconify icon="mdi:close" />
            </IconButton>
          </DialogTitle>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <DialogContent sx={{ p: 3, minHeight: 300 }}>
            <Stack spacing={3}>
              {/* Context Box */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'info.lighter',
                  color: 'info.darker',
                  display: 'flex',
                  gap: 1.5,
                }}
              >
                <Iconify icon="mdi:information-slab-circle-outline" width={24} sx={{ mt: 0.2 }} />
                <Typography variant="body2">
                  Assigning an admin will mark them as the active moderator for this report. They
                  will be responsible for the final decision.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Select Administrator
                </Typography>
                <AdminSelector
                  placeholder="Search by name or ID..."
                  valueId={assignAdminId || undefined}
                  onAdminSelect={(id, admin) => {
                    const next = id ? String(id) : '';
                    setAssignAdminId(next);
                    setAssignAdminObj(admin || null);
                    if (id) fetchAdminById(id);
                  }}
                />
              </Box>

              {/* Selection Preview Card */}
              <Typography variant="subtitle2">Selected Profile</Typography>
              {assignAdminId ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative checkmark background */}
                  <Iconify
                    icon="mdi:check-circle"
                    sx={{
                      position: 'absolute',
                      right: -10,
                      bottom: -10,
                      width: 60,
                      height: 60,
                      opacity: 0.1,
                      color: 'primary.main',
                    }}
                  />

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={assignAdminObj ? adminAvatarSrc(assignAdminObj) : ''}
                      alt={assignAdminObj?.username || ''}
                      sx={{ width: 48, height: 48 }}
                    />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {assignAdminObj?.username || `Admin #${assignAdminId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignAdminObj?.email || 'No email available'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Label color="primary" variant="filled">
                    Selected
                  </Label>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    borderStyle: 'dashed',
                    textAlign: 'center',
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No admin selected yet.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button
              size="large"
              variant="outlined"
              color="inherit"
              onClick={() => setOpenAssignDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="large"
              variant="contained"
              onClick={handleAssignAdmin}
              disabled={!assignAdminId || actionLoading}
              startIcon={
                actionLoading ? (
                  <Iconify icon="eos-icons:loading" />
                ) : (
                  <Iconify icon="mdi:account-check" />
                )
              }
            >
              {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogActions>
        </Dialog>

        <LoadingPopup open={actionLoading} message="Please wait, processing..." />
      </DashboardContent>

      <ImageLightbox {...avatarLightbox.props} />
    </LocalizationProvider>
  );
}

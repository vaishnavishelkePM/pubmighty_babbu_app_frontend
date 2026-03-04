'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Tab,
  Card,
  Chip,
  Grid,
  Tabs,
  Stack,
  Table,
  Paper,
  Slide,
  Button,
  Select,
  Dialog,
  Avatar,
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
  ToggleButton,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
  LinearProgress,
  ToggleButtonGroup,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate, fTime } from 'src/utils/format-time';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';
import { getMime, safeJoin, TabPanel, getFilePublicUrl } from 'src/utils/user-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import CountryBadge from 'src/components/chip/country-badge';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CountrySelector from 'src/components/selectors/country-selector';
import {
  TypeChip,
  YesNoChip,
  StatusChip,
  RegisterChip,
  SORT_BY_OPTIONS,
} from 'src/components/chip/user/user-status';

export default function UsersView() {
  const router = useRouter();
  const theme = useTheme();

  const defaultFilters = useMemo(
    () => ({
      id: '',
      status: '',
      is_active: '',
      is_verified: '',
      include_deleted: false,

      username: '',
      email: '',
      phone: '',
      full_name: '',
      country: '',
      gender: '',
      type: '',
      register_type: '',

      sortBy: 'created_at',
      sortOrder: 'DESC',
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

  // View dialog state
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Media split
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);

  // Media gallery controls
  const [mediaFilter, setMediaFilter] = useState('all'); // all | images | videos
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------- token + mappers ----------------
  const getToken = () => {
    let token = getCookie('session_key');
    if (!token && typeof window !== 'undefined') token = window.localStorage.getItem('session_key');
    return token || null;
  };

  const createdAt = (row) => row?.createdAt || row?.created_at || null;
  const updatedAt = (row) =>
    row?.updatedAt || row?.updated_at || row?.modifiedAt || row?.modified_at || null;
  const avatarLightbox = useImageLightbox();

  const avatarSrc = (row) => {
    const av =
      row?.avatar ||
      row?.profile_image ||
      row?.profileImage ||
      row?.avatar_url ||
      row?.avatarUrl ||
      '';
    if (!av) return '';
    if (String(av).startsWith('http')) return av;

    if (String(av).startsWith('uploads/')) return safeJoin(CONFIG.assetsUrl, av);

    const base = safeJoin(CONFIG.assetsUrl, `uploads/avatar/user/${av}`);
    const v =
      row?.avatar_updated_at ||
      row?.updated_at ||
      row?.updatedAt ||
      row?.created_at ||
      row?.createdAt ||
      Date.now();

    return base.includes('?')
      ? `${base}&v=${encodeURIComponent(v)}`
      : `${base}?v=${encodeURIComponent(v)}`;
  };

  // ---------------- query + fetch ----------------
  const buildQuery = useCallback((filter, page) => {
    const qp = new URLSearchParams();
    qp.set('page', String(page || 1));

    if (filter.status !== '' && filter.status !== null && typeof filter.status !== 'undefined') {
      qp.set('status', String(filter.status));
    }
    if (String(filter.id || '').trim()) qp.set('id', String(filter.id).trim());
    if (filter.is_active !== '') qp.set('is_active', String(filter.is_active));
    if (filter.is_verified !== '') qp.set('is_verified', String(filter.is_verified));
    if (filter.include_deleted === true) qp.set('include_deleted', 'true');

    if ((filter.email || '').trim()) qp.set('email', String(filter.email).trim());
    if ((filter.phone || '').trim()) qp.set('phone', String(filter.phone).trim());
    if ((filter.full_name || '').trim()) qp.set('full_name', String(filter.full_name).trim());
    if ((filter.country || '').trim()) qp.set('country', String(filter.country).trim());
    if ((filter.gender || '').trim()) qp.set('gender', String(filter.gender).trim());
    if ((filter.type || '').trim()) qp.set('type', String(filter.type).trim());
    if ((filter.register_type || '').trim())
      qp.set('register_type', String(filter.register_type).trim());

    const sortBy = String(filter.sortBy || 'created_at');
    const sortOrder = String(filter.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qp.set('sortBy', sortBy);
    qp.set('sortOrder', sortOrder);

    return qp.toString();
  }, []);

  const fetchUsers = useCallback(
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

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/users?${qs}`);

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
          toast.error(res?.msg || res?.message || `Failed to fetch users (HTTP ${result.status})`);
          return;
        }

        const items = res?.data?.items ?? res?.data?.rows ?? [];
        const pag = res?.data?.pagination ?? {};

        cacheRef.current[queryKey] = { rows: items, pagination: pag };
        setRows(items);
        setPagination(pag);
      } catch (error) {
        console.error('fetchUsers NETWORK error:', error);
        toast.error(`Network/CORS error. URL: ${safeJoin(CONFIG.apiUrl, `v1/admin/users?${qs}`)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, router]
  );

  const fetchUserDetails = useCallback(
    async (userId) => {
      const token = getToken();
      if (!token) {
        toast.error('Session expired. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return { user: null, files: [] };
      }

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/users/${userId}`);

      try {
        const result = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
          validateStatus: () => true,
        });

        const res = result?.data;
        if (!res?.success) {
          toast.error(res?.msg || res?.message || 'Failed to fetch user details');
          return { user: null, files: [] };
        }

        const data = res?.data || null;
        const user = data?.user || data?.profile || data || null;

        const files = data?.files || data?.media || data?.uploads || [];

        return { user, files: Array.isArray(files) ? files : [] };
      } catch (e) {
        console.error(e);
        toast.error('Something went wrong while fetching user details');
        return { user: null, files: [] };
      }
    },
    [router]
  );

  useEffect(() => {
    fetchUsers(defaultFilters, 1, true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- filters form ----------------
  const {
    control: filterControl,
    handleSubmit: handleFilterSubmit,
    reset: resetFilterForm,
  } = useForm({
    defaultValues: defaultFilters,
    mode: 'onBlur',
  });

  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,
      id: String(vals.id || '').trim(),
      status: vals.status === '' ? '' : Number(vals.status),

      is_active: vals.is_active === '' ? '' : String(vals.is_active),
      is_verified: vals.is_verified === '' ? '' : String(vals.is_verified),

      email: String(vals.email || ''),
      phone: String(vals.phone || ''),
      full_name: String(vals.full_name || ''),
      country: String(vals.country || ''),
      gender: String(vals.gender || ''),
      type: String(vals.type || ''),
      register_type: String(vals.register_type || ''),

      sortBy: String(vals.sortBy || 'created_at'),
      sortOrder: String(vals.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      include_deleted: !!vals.include_deleted,
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchUsers(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    resetFilterForm(defaultFilters);
    setResetFiltersKey((x) => x + 1);
    cacheRef.current = {};
    fetchUsers(defaultFilters, 1, true);
  };

  // ---------------- view + media ----------------
  const outlinedTextSx = {
    px: 1.25,
    py: 0.25,
    borderRadius: 1.5,
    border: '1px solid rgba(255,255,255,0.9)',
    color: 'common.white',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: 0.3,
    lineHeight: 1.4,
  };

  const openViewDialog = async (row) => {
    setSelected(row);
    setTab(0);
    setMediaFilter('all');
    setLightboxOpen(false);
    setLightboxIndex(0);

    setSelectedFiles([]);
    setSelectedImages([]);
    setSelectedVideos([]);
    setViewOpen(true);

    try {
      setViewLoading(true);
      const { user, files } = await fetchUserDetails(row?.id);

      if (user) setSelected(user);

      const normalized = (Array.isArray(files) ? files : []).map((f) => {
        const url = getFilePublicUrl(f);
        const mime = getMime(f);
        const name = f?.name || f?.file_name || f?.filename || `File #${f?.id || ''}`;
        return { ...f, __url: url, __mime: mime, __name: name };
      });

      const imgs = normalized.filter((x) => String(x.__mime || '').startsWith('image/'));
      const vids = normalized.filter((x) => String(x.__mime || '').startsWith('video/'));

      setSelectedFiles(normalized);
      setSelectedImages(imgs);
      setSelectedVideos(vids);
    } finally {
      setViewLoading(false);
    }
  };

  const openEditPage = (row) => {
    if (!row?.id) return;
    router.push(`/dashboard/users/edit/${row.id}`);
  };

  // Lightbox handlers
  const handleOpenLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => setLightboxOpen(false);

  const handleLightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % Math.max(1, selectedImages.length));
  };

  const handleLightboxPrev = () => {
    setLightboxIndex(
      (prev) => (prev - 1 + Math.max(1, selectedImages.length)) % Math.max(1, selectedImages.length)
    );
  };

  // ---------------- delete ----------------
  const openDeleteDialog = (row) => {
    setDeleteRow(row);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteRow(null);
  };

  const confirmDelete = async () => {
    const row = deleteRow;
    if (!row?.id) return;

    const token = getToken();
    if (!token) return;

    try {
      setDeleteLoading(true);

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/users/${row.id}/delete`);
      const result = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      const res = result?.data;
      if (!res?.success) {
        toast.error(res?.message || res?.msg || 'Failed to delete user');
        return;
      }

      toast.success(res?.message || res?.msg || 'User deleted');
      setRows((prev) => prev.filter((x) => Number(x.id) !== Number(row.id)));

      if (selected?.id && Number(selected.id) === Number(row.id)) {
        setViewOpen(false);
        setSelected(null);
        setSelectedFiles([]);
        setSelectedImages([]);
        setSelectedVideos([]);
      }

      cacheRef.current = {};
      closeDeleteDialog();

      // refresh KPIs after delete
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Users"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Users', href: paths.dashboard.users?.root || '#' },
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
            onClick={() => router.push(paths.dashboard.users?.add || '#')}
          >
            <Iconify icon="material-symbols:add" sx={{ width: 20, mr: 1 }} />
            Add
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilter}>
        <form onSubmit={handleFilterSubmit(applyFilters)} key={resetFiltersKey}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Controller
                name="id"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="User ID"
                    placeholder="Enter user id…"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="full_name"
                control={filterControl}
                render={({ field }) => (
                  <TextField {...field} label="Username" placeholder="Search name…" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="email"
                control={filterControl}
                render={({ field }) => (
                  <TextField {...field} label="Email" placeholder="Search email…" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="phone"
                control={filterControl}
                render={({ field }) => (
                  <TextField {...field} label="Phone" placeholder="Search phone…" fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="country"
                control={filterControl}
                render={({ field }) => (
                  <CountrySelector
                    label="Country"
                    placeholder="Select country…"
                    multiple={false}
                    valueCode={field.value || ''}
                    onChangeCode={(code) => field.onChange(code)}
                    fullWidth
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Controller
                  name="gender"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Gender">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                      <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Register Type</InputLabel>
                <Controller
                  name="register_type"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Register Type">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="gmail">Gmail</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Controller
                  name="status"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Status">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value={0}>Pending</MenuItem>
                      <MenuItem value={1}>Active</MenuItem>
                      <MenuItem value={2}>Suspended</MenuItem>
                      <MenuItem value={3}>Disabled</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Active</InputLabel>
                <Controller
                  name="is_active"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Active">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="true">On</MenuItem>
                      <MenuItem value="false">Off</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Verified</InputLabel>
                <Controller
                  name="is_verified"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Verified">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="true">Yes</MenuItem>
                      <MenuItem value="false">No</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Controller
                  name="sortBy"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Sort By">
                      {SORT_BY_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Controller
                  name="sortOrder"
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

            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} sx={{ display: 'flex', gap: 1 }}>
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
                  variant="contained"
                  fullWidth
                  disabled={isLoading}
                  sx={{ height: 50 }}
                >
                  Apply
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Collapse>

      {/* KPI Cards  */}
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
          <Typography sx={{ fontSize: 14 }}>Total Users</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {pagination?.totalItems ?? pagination?.total ?? 0}
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
          <Iconify icon="solar:users-group-rounded-bold" />
        </Box>
      </Card>
      {/* Table */}
      <Card sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton cols={16} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Type</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Register</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Gender</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Active</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Verified</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Coins</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Spent</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Created</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Updated</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>

                    <TableCell sx={{ minWidth: 260 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          alt={row.full_name}
                          src={avatarSrc(row)}
                          onClick={() => avatarLightbox.open([avatarSrc(row)], 0)}
                          imgProps={{
                            onError: (e) => {
                              e.currentTarget.src = '/assets/images/avatar_default.png';
                            },
                          }}
                          sx={{ width: 40, height: 40 }}
                        />

                        <ListItemText
                          primary={
                            <Tooltip title={row.full_name || ''} placement="top" arrow>
                              <span
                                style={{
                                  display: 'inline-block',
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 600,
                                }}
                              >
                                {row.full_name || '—'}
                              </span>
                            </Tooltip>
                          }
                          secondary={
                            <Tooltip title={row.email || row.phone || ''} placement="top" arrow>
                              <span
                                style={{
                                  display: 'inline-block',
                                  maxWidth: 220,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: 13,
                                }}
                              >
                                {row.email || row.phone || '—'}
                              </span>
                            </Tooltip>
                          }
                          sx={{ minWidth: 0 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <TypeChip value={row?.type} />
                    </TableCell>

                    <TableCell>
                      <RegisterChip value={row?.register_type} />
                    </TableCell>

                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.gender || '—'}</TableCell>
                    <TableCell>{row.city || '—'}</TableCell>
                    <TableCell>{row.state || '—'}</TableCell>

                    <TableCell>
                      <CountryBadge code={row.country} sx={{ border: 'none' }} />
                    </TableCell>

                    <TableCell>
                      <StatusChip value={row.status} />
                    </TableCell>

                    <TableCell>
                      <YesNoChip value={row.is_active} yes="On" no="Off" />
                    </TableCell>

                    <TableCell>
                      <YesNoChip value={row.is_verified} yes="Yes" no="No" />
                    </TableCell>

                    <TableCell>{Number(row?.coins || 0)}</TableCell>
                    <TableCell>{row?.total_spent ?? '0.00'}</TableCell>

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

                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View details" placement="top" arrow>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openViewDialog(row)}
                          >
                            <Iconify icon="mdi:eye" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit" placement="top" arrow>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openEditPage(row)}
                          >
                            <Iconify icon="mage:edit-fill" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete" placement="top" arrow>
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

      {/* Pagination */}
      <Stack direction="row" justifyContent="center" alignItems="center" sx={{ m: 2 }}>
        <Pagination
          count={pagination?.totalPages || 1}
          page={currentPage}
          onChange={(_, p) => {
            setCurrentPage(p);
            fetchUsers(filters, p, true);
          }}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* View dialog  */}

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        fullWidth
        maxWidth="md"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2.5,
          }}
        >
          <Typography variant="h6" component="span">
            User Profile
          </Typography>
          <IconButton onClick={() => setViewOpen(false)} edge="end">
            <Iconify icon="mdi:close" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
          {viewLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <LinearProgress sx={{ maxWidth: 300, mx: 'auto', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading user details...
              </Typography>
            </Box>
          ) : !selected ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <Typography>No data selected.</Typography>
            </Box>
          ) : (
            <>
              {/* Hero */}
              <Box
                sx={{
                  position: 'relative',
                  pt: 5,
                  pb: 4,
                  px: 3,
                  background: (t) =>
                    `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.9)} 0%, ${alpha(t.palette.primary.main, 0.8)} 100%)`,
                  color: 'common.white',
                  textAlign: 'center',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ position: 'absolute', top: 16, right: 16 }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    color="inherit"
                    sx={{
                      color: 'primary.dark',
                      bgcolor: 'common.white',
                      '&:hover': { bgcolor: 'grey.200' },
                    }}
                    startIcon={<Iconify icon="mage:edit-fill" />}
                    onClick={() => {
                      setViewOpen(false);
                      openEditPage(selected);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                    onClick={() => {
                      setViewOpen(false);
                      openDeleteDialog(selected);
                    }}
                  >
                    Delete
                  </Button>
                </Stack>

                <Avatar
                  src={avatarSrc(selected)}
                  alt={selected.username}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 2,
                    border: '4px solid',
                    borderColor: 'common.white',
                    boxShadow: (t) => t.shadows[8],
                  }}
                />

                <Typography variant="h4" fontWeight="bold">
                  {selected.username || selected.full_name || 'No Name'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                  {selected.email || selected.phone || 'No Contact Info'}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent="center"
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Box sx={outlinedTextSx}>{selected.is_active ? 'Active' : 'Inactive'}</Box>
                  <Box sx={outlinedTextSx}>{selected.is_verified ? 'Verified' : 'Unverified'}</Box>

                  <Box sx={outlinedTextSx}>
                    {selected?.type ? (String(selected.type) === 'bot' ? 'Bot' : 'Real') : 'User'}
                  </Box>

                  <Box sx={outlinedTextSx}>
                    {selected?.register_type
                      ? String(selected.register_type).toUpperCase()
                      : 'MANUAL'}
                  </Box>

                  {selected.country && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.25,
                        py: 0.25,
                        bgcolor: 'common.green',
                        borderRadius: 1.5,
                        boxShadow: (t) => t.shadows[1],
                      }}
                    >
                      <CountryBadge
                        code={selected.country}
                        sx={{ border: 'none', bgcolor: 'transparent', color: 'white', p: 0 }}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Tabs */}
              <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 48 }}>
                  <Tab
                    label="Overview"
                    icon={<Iconify icon="mdi:account-box-outline" width={20} />}
                    sx={{ ml: 2 }}
                    iconPosition="start"
                  />
                  <Tab
                    label="Location"
                    icon={<Iconify icon="mdi:map-marker-outline" width={20} />}
                    iconPosition="start"
                  />
                  <Tab
                    label={`Media (${selectedImages.length + selectedVideos.length})`}
                    icon={<Iconify icon="mdi:image-multiple-outline" width={20} />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              {/* Content */}
              <Box sx={{ p: 3, minHeight: 400 }}>
                {/* Tab 0: Overview */}
                <TabPanel value={tab} index={0}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={7} sx={{ display: 'flex' }}>
                      <Stack spacing={3} sx={{ width: '100%' }}>
                        <Card sx={{ p: 3, boxShadow: (t) => t.customShadows?.card }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            About
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.8 }}
                          >
                            {selected.bio || 'No bio available for this user.'}
                          </Typography>
                        </Card>

                        <Card sx={{ p: 3, boxShadow: (t) => t.customShadows?.card }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Interests
                          </Typography>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {(String(selected.interests || '') || '')
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean)
                              .map((tag) => (
                                <Chip key={tag} label={tag} variant="soft" color="primary" />
                              ))}

                            {!String(selected.interests || '').trim() && (
                              <Typography variant="body2" color="text.secondary">
                                No interests listed.
                              </Typography>
                            )}
                          </Stack>
                        </Card>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={5} sx={{ display: 'flex' }}>
                      <Card
                        sx={{
                          p: 3,
                          width: '100%',
                          height: '100%',
                          boxShadow: (t) => t.customShadows?.card,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Identity
                        </Typography>

                        <Stack spacing={2} sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Full Name
                            </Typography>
                            <Typography variant="subtitle2">{selected.full_name || '—'}</Typography>
                          </Stack>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Type
                            </Typography>
                            <TypeChip value={selected?.type} />
                          </Stack>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Coins
                            </Typography>
                            <Typography variant="subtitle2">
                              {Number(selected?.coins || 0)}
                            </Typography>
                          </Stack>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Total Spent
                            </Typography>
                            <Typography variant="subtitle2">
                              {selected?.total_spent ?? '0.00'}
                            </Typography>
                          </Stack>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Created
                            </Typography>
                            <Typography variant="subtitle2">
                              {createdAt(selected) ? fDate(createdAt(selected)) : '—'}
                            </Typography>
                          </Stack>

                          <Box sx={{ flexGrow: 1 }} />
                        </Stack>
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Card sx={{ p: 3, boxShadow: (t) => t.customShadows?.card }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Physical & Education
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography>Gender: {String(selected?.gender ?? '—')}</Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Typography>Height: {String(selected?.height ?? '—')}</Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Typography>Education: {String(selected?.education ?? '—')}</Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Typography>
                              Looking For: {String(selected?.looking_for ?? '—')}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Typography>Birth Date: {String(selected?.dob ?? '—')}</Typography>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* Tab 1: Location */}
                <TabPanel value={tab} index={1}>
                  <Card sx={{ p: 3 }}>
                    <Stack spacing={3}>
                      <Typography variant="h6">Location Details</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Country
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                              <CountryBadge code={selected.country} />
                              <Typography variant="subtitle1">{selected.country || '—'}</Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              State
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                              {selected.state || '—'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              City
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                              {selected.city || '—'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Address
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                              {selected.address || '—'}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Card>
                </TabPanel>

                {/* Tab 2: Media Gallery */}
                <TabPanel value={tab} index={2}>
                  <Stack spacing={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">Media Gallery</Typography>
                      <ToggleButtonGroup
                        value={mediaFilter}
                        exclusive
                        onChange={(_, v) => v && setMediaFilter(v)}
                        size="small"
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <ToggleButton value="all">All</ToggleButton>
                        <ToggleButton value="images" disabled={selectedImages.length === 0}>
                          Images
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    {/* Images */}
                    {(mediaFilter === 'all' || mediaFilter === 'images') && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                          Images ({selectedImages.length})
                        </Typography>

                        {selectedImages.length > 0 ? (
                          <Grid container spacing={2}>
                            {selectedImages.map((img, index) => {
                              const src = img.__url || getFilePublicUrl(img);
                              return (
                                <Grid item key={img.id ?? img.__name ?? index} xs={6} sm={4} md={3}>
                                  <Paper
                                    onClick={() => src && handleOpenLightbox(index)}
                                    sx={{
                                      borderRadius: 2,
                                      overflow: 'hidden',
                                      position: 'relative',
                                      pt: '100%',
                                      cursor: src ? 'pointer' : 'default',
                                      boxShadow: (t) => t.customShadows?.z4,
                                      '&:hover .overlay': { opacity: 1 },
                                      '&:hover img': { transform: 'scale(1.1)' },
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={src}
                                      alt={img.__name || 'Image'}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.4s ease',
                                      }}
                                    />

                                    <Box
                                      className="overlay"
                                      sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        bgcolor: alpha(theme.palette.grey[900], 0.4),
                                        opacity: 0,
                                        transition: 'opacity 0.3s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'common.white',
                                      }}
                                    >
                                      <Iconify icon="solar:eye-bold" width={32} />
                                    </Box>
                                  </Paper>
                                </Grid>
                              );
                            })}
                          </Grid>
                        ) : (
                          <Paper
                            variant="outlined"
                            sx={{
                              py: 6,
                              textAlign: 'center',
                              borderRadius: 2,
                              borderStyle: 'dashed',
                            }}
                          >
                            <Iconify
                              icon="mdi:image-off-outline"
                              width={48}
                              sx={{ color: 'text.disabled', mb: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              No images found
                            </Typography>
                          </Paper>
                        )}
                      </Box>
                    )}
                  </Stack>
                </TabPanel>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------- LIGHTBOX -------------------- */}
      <Dialog
        fullScreen
        open={lightboxOpen}
        onClose={handleCloseLightbox}
        PaperProps={{ sx: { bgcolor: 'common.black' } }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99,
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: 'common.white' }}>
            {lightboxIndex + 1} / {selectedImages.length}
          </Typography>

          <IconButton onClick={handleCloseLightbox} sx={{ color: 'common.white' }}>
            <Iconify icon="mdi:close" width={28} />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '100%',
          }}
        >
          {selectedImages.length > 1 && (
            <IconButton
              onClick={handleLightboxPrev}
              sx={{
                position: 'absolute',
                left: 20,
                color: 'common.white',
                bgcolor: alpha(theme.palette.grey[800], 0.5),
                '&:hover': { bgcolor: alpha(theme.palette.grey[800], 0.8) },
              }}
            >
              <Iconify icon="mdi:chevron-left" width={40} />
            </IconButton>
          )}

          {selectedImages[lightboxIndex] && (
            <Box
              component="img"
              src={
                selectedImages[lightboxIndex].__url ||
                getFilePublicUrl(selectedImages[lightboxIndex])
              }
              alt={selectedImages[lightboxIndex].__name || 'Image'}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}

          {selectedImages.length > 1 && (
            <IconButton
              onClick={handleLightboxNext}
              sx={{
                position: 'absolute',
                right: 20,
                color: 'common.white',
                bgcolor: alpha(theme.palette.grey[800], 0.5),
                '&:hover': { bgcolor: alpha(theme.palette.grey[800], 0.8) },
              }}
            >
              <Iconify icon="mdi:chevron-right" width={40} />
            </IconButton>
          )}
        </Box>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog
        open={deleteOpen}
        onClose={closeDeleteDialog}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'error.lighter',
              color: 'error.main',
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </Box>
          Delete User
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to delete{' '}
            <b>{deleteRow?.username ? `"${deleteRow.username}"` : 'this user'}</b>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            This will soft-delete the user profile (can be recovered if your backend supports
            restore).
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading} color="inherit">
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleteLoading}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

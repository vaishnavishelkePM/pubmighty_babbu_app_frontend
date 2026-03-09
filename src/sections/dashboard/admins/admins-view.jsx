'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import {
  Grid,
  Card,
  Chip,
  Stack,
  Table,
  Slide,
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
  Pagination,
  IconButton,
  FormControl,
  ListItemText,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { safeJoin } from 'src/utils/helper';
import { getSessionToken } from 'src/utils/helper';
import { fDate, fTime } from 'src/utils/format-time';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LabeledValue from 'src/components/lables/labeled-value';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { TwoFaChip, StatusChip } from 'src/components/chip/admin/admin-chip';

// dialogs
import AddAdminView from './add-admin-view';
import EditAdminView from './edit-admin-view';

function buildQuery(filters, page) {
  const qp = new URLSearchParams();
  qp.append('page', String(page || 1));
  if ((filters.id || '').trim()) qp.append('id', String(filters.id).trim());
  if ((filters.username || '').trim()) qp.append('username', String(filters.username).trim());
  if ((filters.email || '').trim()) qp.append('email', String(filters.email).trim());
  if (filters.role) qp.append('role', String(filters.role));

  if (filters.status !== '' && filters.status !== null && typeof filters.status !== 'undefined') {
    qp.append('status', String(filters.status));
  }

  if (
    filters.twoFactorEnabled !== '' &&
    filters.twoFactorEnabled !== null &&
    typeof filters.twoFactorEnabled !== 'undefined'
  ) {
    qp.append('twoFactorEnabled', String(filters.twoFactorEnabled));
  }

  if (filters.sortBy) qp.append('sortBy', String(filters.sortBy));
  if (filters.sortDir) qp.append('sortDir', String(filters.sortDir));

  return qp.toString();
}

export default function AdminsView() {
  const router = useRouter();

  const defaultFilters = useMemo(
    () => ({
      id: '',
      username: '',

      email: '',
      role: '',
      status: '',
      twoFactorEnabled: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
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

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  //  Add/Edit dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const createdAt = (row) => row?.createdAt || row?.created_at || null;
  const updatedAt = (row) => row?.updatedAt || row?.updated_at || null;

  const getAvatarBust = (row) =>
    row?._avatar_bust ||
    row?.updatedAt ||
    row?.updated_at ||
    row?.updated_at_ts ||
    row?.updated_at_time ||
    Date.now();

  const avatarSrc = (row) => {
    const file = row?.avatar;
    if (!file) return '';
    const v = getAvatarBust(row);
    return `${CONFIG.assetsUrl}/uploads/avatar/admin/${file}?v=${encodeURIComponent(v)}`;
  };
  const avatarLightbox = useImageLightbox();
  const fetchAdmins = useCallback(
    async (nextFilters, page = 1, hardReload = false) => {
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

      const qs = buildQuery(nextFilters, page);
      const queryKey = qs;

      if (cacheRef.current[queryKey] && !hardReload) {
        const cached = cacheRef.current[queryKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        return;
      }

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/manage-admins?${qs}`);

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
          toast.error(res?.msg || res?.message || `Failed to fetch admins (HTTP ${result.status})`);
          return;
        }

        const _rows = res?.data?.rows ?? [];
        const pag = res?.data?.pagination ?? {};

        cacheRef.current[queryKey] = { rows: _rows, pagination: pag };
        setRows(_rows);
        setPagination(pag);
      } catch (error) {
        console.error('fetchAdmins NETWORK error:', error);
        toast.error(
          `Network/CORS error. URL: ${safeJoin(CONFIG.apiUrl, `/v1/admin/manage-admins`)}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchAdmins(defaultFilters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- FILTER FORM ----------------
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
      twoFactorEnabled: vals.twoFactorEnabled === '' ? '' : Number(vals.twoFactorEnabled),
      sortBy: vals.sortBy || 'createdAt',
      sortDir: vals.sortDir || 'desc',
    };

    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchAdmins(next, 1, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    resetFilterForm(defaultFilters);
    cacheRef.current = {};
    fetchAdmins(defaultFilters, 1, true);
  };

  //  After Add/Edit success: refresh list (and clear cache)
  const hardRefresh = (page = currentPage) => {
    cacheRef.current = {};
    fetchAdmins(filters, page, true);
  };

  //  Edit dialog open
  const openEditDialog = (row) => {
    const id = Number(row?.id);
    if (!id) return;
    setEditId(id);
    setEditOpen(true);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Admins"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Admins', href: paths.dashboard.admins?.root || '#' },
          ]}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          {/*  Add opens DIALOG now */}
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            <Iconify icon="material-symbols:add" sx={{ width: 20, mr: 1 }} />
            Add
          </Button>
        </Box>
      </Box>

      {/* FILTERS */}
      <Collapse in={showFilter}>
        <form onSubmit={handleFilterSubmit(applyFilters)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Controller
                name="id"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Admin ID"
                    placeholder="e.g. 12"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="username"
                control={filterControl}
                render={({ field }) => (
                  <TextField {...field} label="Username" placeholder="Enter username." fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="email"
                control={filterControl}
                render={({ field }) => (
                  <TextField {...field} label="Email" placeholder="enter email..." fullWidth />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Controller
                  name="role"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Role" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="superAdmin">Super Admin</MenuItem>
                      <MenuItem value="staff">Staff</MenuItem>
                      <MenuItem value="paymentManager">Payment Manager</MenuItem>
                      <MenuItem value="support">Support</MenuItem>
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
                    <Select {...field} label="Status" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>

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
                <InputLabel>2FA</InputLabel>
                <Controller
                  name="twoFactorEnabled"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="2FA" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value={0}>Off</MenuItem>
                      <MenuItem value={1}>Authenticator App</MenuItem>
                      <MenuItem value={2}>Email</MenuItem>
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
                    <Select {...field} label="Sort By" value={field.value ?? 'createdAt'}>
                      <MenuItem value="id">ID</MenuItem>
                      <MenuItem value="username">Username</MenuItem>
                      <MenuItem value="email">Email</MenuItem>
                      <MenuItem value="role">Role</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="createdAt">Created</MenuItem>
                      <MenuItem value="updatedAt">Updated</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Controller
                  name="sortDir"
                  control={filterControl}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Order"
                      value={String(field.value || 'desc').toLowerCase()}
                      onChange={(e) =>
                        field.onChange(String(e.target.value || 'desc').toLowerCase())
                      }
                    >
                      <MenuItem value="asc">ASC</MenuItem>
                      <MenuItem value="desc">DESC</MenuItem>
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

      {/* KPI CARD */}
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
          <Typography sx={{ fontSize: 14 }}>Total Admins</Typography>
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
          <Iconify icon="mdi:account-group" />
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
                  <TableCell>Admin</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>First Name</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Last Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>2FA</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Created</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => {
                  const bust = getAvatarBust(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            onClick={() => avatarLightbox.open([avatarSrc(row)], 0)}
                            key={`${row.id}-${bust}`}
                            alt={row.username}
                            src={avatarSrc(row)}
                            sx={{ width: 40, height: 40 }}
                          />
                          <ListItemText
                            primary={row.username}
                            secondary={
                              <Typography component="span" variant="body2" color="text.secondary">
                                {row.email}
                              </Typography>
                            }
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>{row?.first_name || '—'}</TableCell>
                      <TableCell>{row?.last_name || '—'}</TableCell>

                      <TableCell>
                        <Chip
                          label={row.role}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>

                      <TableCell>
                        <StatusChip value={row.status} />
                      </TableCell>

                      <TableCell>
                        <TwoFaChip row={row} />
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

                          {/*  Edit opens DIALOG now */}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openEditDialog(row)}
                            >
                              <Iconify icon="mage:edit-fill" />
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

      {/* Pagination */}
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
            fetchAdmins(filters, p);
          }}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: (theme) => ({
            borderRadius: 2,
            backgroundImage: 'none',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          }),
        }}
      >
        {/* Header */}
        <Box
          sx={(theme) => ({
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          })}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={(theme) => ({
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                bgcolor:
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'primary.lighter',
                color: 'primary.main',
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <Iconify icon="solar:user-rounded-bold-duotone" width={24} />
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, lineHeight: 1, color: 'text.primary' }}
              >
                Admin Details
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={() => setViewOpen(false)}
            size="small"
            sx={(theme) => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              color: 'text.secondary',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'transparent',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'action.hover',
              },
            })}
          >
            <Iconify icon="mingcute:close-line" width={18} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          {selected && (
            <Box>
              {/* Profile Summary Card */}
              <Box
                sx={(theme) => ({
                  p: 3,
                  bgcolor:
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'background.default',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                })}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar
                    src={avatarSrc(selected)}
                    sx={(theme) => ({
                      width: 80,
                      height: 80,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor:
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'grey.200',
                    })}
                  >
                    {selected.username?.charAt(0).toUpperCase()}
                  </Avatar>

                  <Stack spacing={0.6}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {selected.first_name || 'N/A'} {selected.last_name || ''}
                    </Typography>

                    {/* Username - now always visible */}
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'text.secondary',
                        fontWeight: 600,
                      }}
                    >
                      <Iconify icon="solar:mention-square-bold-duotone" width={16} />
                      {selected.username || '—'}
                    </Typography>

                    {/* Chips row */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <StatusChip value={selected.status} />

                      <Chip
                        label={selected.role}
                        size="small"
                        variant="outlined"
                        sx={(theme) => ({
                          textTransform: 'capitalize',
                          fontWeight: 700,
                          borderColor: theme.palette.divider,
                          color: 'text.primary',
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.06)'
                              : 'background.paper',
                        })}
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Box>

              {/* Information Grid */}
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Contact */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={2}>
                      <Typography
                        variant="overline"
                        sx={{ fontWeight: 800, color: 'primary.main' }}
                      >
                        Contact Information
                      </Typography>
                      <LabeledValue label="Email Address">{selected.email || '—'}</LabeledValue>
                      <LabeledValue label="Admin ID">#{selected.id}</LabeledValue>
                    </Stack>
                  </Grid>

                  {/* Security */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={2}>
                      <Typography
                        variant="overline"
                        sx={{ fontWeight: 800, color: 'primary.main' }}
                      >
                        Security Settings
                      </Typography>

                      <LabeledValue label="Two-Factor Auth">
                        <TwoFaChip row={selected} />
                      </LabeledValue>

                      <LabeledValue label="Auth Method">
                        <Typography
                          variant="body2"
                          sx={{
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: 'text.primary',
                          }}
                        >
                          {selected.two_fa_method || 'email'}
                        </Typography>
                      </LabeledValue>
                    </Stack>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

                {/* Dates */}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                      Created Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {fDate(createdAt(selected))} • {fTime(createdAt(selected))}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                      Last System Update
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {fDate(updatedAt(selected))} • {fTime(updatedAt(selected))}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>

        {/* Footer */}
        <DialogActions
          sx={(theme) => ({
            p: 2,
            bgcolor: 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
            justifyContent: 'flex-end',
          })}
        >
          <Button
            variant="contained"
            size="small"
            onClick={() => setViewOpen(false)}
            startIcon={<Iconify icon="mingcute:close-line" width={16} />}
            sx={{
              minWidth: 110,
              height: 36,
              borderRadius: 1.5,
              fontWeight: 700,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- ADD DIALOG ---------------- */}
      <AddAdminView
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);

          setCurrentPage(1);
          hardRefresh(1);
        }}
      />

      {/* ---------------- EDIT DIALOG ---------------- */}
      <EditAdminView
        open={editOpen}
        adminId={editId}
        onClose={() => setEditOpen(false)}
        onUpdated={() => {
          setEditOpen(false);
          hardRefresh(currentPage);
        }}
      />
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

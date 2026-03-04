'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useRef, useState, useEffect, useCallback } from 'react';

import { alpha } from '@mui/material/styles';
import ListItemText from '@mui/material/ListItemText';
import {
  Box,
  Card,
  Grid,
  Stack,
  Slide,
  Table,
  Button,
  Dialog,
  Select,
  Avatar,
  Divider,
  Tooltip,
  MenuItem,
  TableRow,
  Collapse,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  IconButton,
  Pagination,
  Typography,
  InputLabel,
  FormControl,
  DialogTitle,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { fDate, fTime } from 'src/utils/format-time';
import { getCookie, queryStringFrom } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import IconSelector from 'src/components/selectors/icon-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { statusLabel, statusColor } from 'src/components/chip/notification/notification_chip';

// ----------------------------------------------------------------------

export default function NotificationCategoriesView() {
  const session_key = getCookie('session_key');

  const API_ROOT = String(CONFIG.apiUrl || '').replace(/\/+$/, '');
  const baseUrl = `${API_ROOT}/v1/admin`;

  // ---------------- Filters ----------------
  const defaultFilters = {
    id: '',
    q: '',
    status: '',
    orderBy: 'created_at',
    order: 'DESC',
    perPage: 20,
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [resetFilters, setResetFilters] = useState(1);

  // ---------------- Table data ----------------
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

  // ---------------- Dialogs ----------------
  const [selectedRow, setSelectedRow] = useState(null);
  const createdAt = (row) => row?.createdAt || row?.created_at || row?.created || null;
  const updatedAt = (row) => row?.updatedAt || row?.updated_at || row?.updated || null;

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    icon: '',
    status: 'active',
  });

  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    id: '',
    name: '',
    icon: '',
    status: 'active',
  });

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${session_key}`,
      'Content-Type': 'application/json',
    }),
    [session_key]
  );

  const canEdit = (row) => !!row?.id;
  const canDelete = (row) => !!row?.id;

  const buildQueryForApi = (filter, page) => {
    const q = {
      id: filter.id ? Number(filter.id) : '',
      q: filter.q ? String(filter.q).trim() : '',
      status: filter.status || '',
      page,
      limit: Number(filter.perPage) || 20,
      perPage: Number(filter.perPage) || 20,
      orderBy: filter.orderBy || 'created_at',
      order: filter.order || 'DESC',
    };

    Object.keys(q).forEach((k) => {
      if (q[k] === '' || q[k] === null || typeof q[k] === 'undefined') delete q[k];
    });

    return q;
  };

  const pickListFromApi = (result) => {
    const list = result?.data?.categories ?? result?.categories ?? [];
    const pag = result?.data?.pagination ??
      result?.pagination ?? {
        totalItems: list.length,
        totalPages: 1,
        currentPage: 1,
        perPage: 20,
      };

    return { list, pag };
  };

  // ----------------------------------------------------------------------
  // Fetch list
  const fetchCategories = useCallback(
    async (filter, page = 1, hardReload = false) => {
      setLoading(true);

      const queryObj = buildQueryForApi(filter, page);
      const queryKey = queryStringFrom(queryObj);

      if (cacheRef.current[queryKey] && !hardReload) {
        const cached = cacheRef.current[queryKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        setLoading(false);
        return;
      }

      const url = `${baseUrl}/notifications/categories?${queryKey}`;

      try {
        const res = await axios.get(url, { headers: authHeaders(), validateStatus: () => true });
        const result = res.data;

        if (!result?.success) {
          toast.error(
            result?.message || result?.msg || `Failed to fetch categories (HTTP ${res.status})`
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

        const { list, pag } = pickListFromApi(result);

        setRows(list || []);
        setPagination(pag || {});
        cacheRef.current[queryKey] = { rows: list || [], pagination: pag || {} };
      } catch (e) {
        toast.error('Error while loading categories.');
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, baseUrl]
  );

  useEffect(() => {
    fetchCategories(defaultFilters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------
  // Filter handlers
  const handleFilterApply = () => {
    setCurrentPage(1);
    cacheRef.current = {};
    fetchCategories(filters, 1, true);
  };

  const handleFilterReset = () => {
    setCurrentPage(1);
    setFilters(defaultFilters);
    cacheRef.current = {};
    setResetFilters((x) => x + 1);
    fetchCategories(defaultFilters, 1, true);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    fetchCategories(filters, p);
  };

  // ----------------------------------------------------------------------
  // Open dialogs
  const openAdd = () => {
    setAddForm({ name: '', icon: '', status: 'active' });
    setOpenAddDialog(true);
  };

  const openUpdate = (row) => {
    if (!canEdit(row)) return;
    setSelectedRow(row);
    setUpdateForm({
      id: row?.id ? String(row.id) : '',
      name: String(row?.name || ''),
      icon: String(row?.icon || ''),
      status: String(row?.status || 'active'),
    });
    setOpenUpdateDialog(true);
  };

  const openDelete = (row) => {
    if (!canDelete(row)) return;
    setSelectedRow(row);
    setOpenDeleteDialog(true);
  };

  // ----------------------------------------------------------------------
  // API Actions: Add / Update / Delete
  const handleAdd = async () => {
    const name = String(addForm.name || '')
      .trim()
      .toUpperCase();
    const icon = String(addForm.icon || '').trim();
    const status = String(addForm.status || 'active').trim();

    if (!name) {
      toast.error('name is required.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(name)) {
      toast.error('name must be like: PROMO_OFFER, SYSTEM_ALERT, etc.');
      return;
    }

    setActionLoading(true);
    try {
      const url = `${baseUrl}/notifications/categories/add`;

      const res = await axios.post(
        url,
        { name, icon: icon || null, status },
        { headers: authHeaders(), validateStatus: () => true }
      );

      const result = res.data;

      if (!result?.success) {
        toast.error(result?.message || 'Failed to create category');
        return;
      }

      toast.success(result?.message || 'Category created');
      setOpenAddDialog(false);

      cacheRef.current = {};
      fetchCategories(filters, currentPage, true);
    } catch (e) {
      toast.error('Error while creating category.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    const id = Number(updateForm.id);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Invalid category id.');
      return;
    }

    const name = String(updateForm.name || '')
      .trim()
      .toUpperCase();
    const icon = String(updateForm.icon || '').trim();
    const status = String(updateForm.status || '').trim();

    setActionLoading(true);
    try {
      const url = `${baseUrl}/notifications/categories/update`;

      const body = {
        id,
        name: name || null,
        icon: icon === '' ? null : icon,
        status: status || null,
      };

      const res = await axios.post(url, body, {
        headers: authHeaders(),
        validateStatus: () => true,
      });

      const result = res.data;

      if (!result?.success) {
        toast.error(result?.message || 'Failed to update category');
        return;
      }

      toast.success(result?.message || 'Category updated');
      setOpenUpdateDialog(false);

      cacheRef.current = {};
      fetchCategories(filters, currentPage, true);
    } catch (e) {
      toast.error('Error while updating category.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow?.id) return;

    setActionLoading(true);
    try {
      const url = `${baseUrl}/notifications/categories/delete`;

      const res = await axios.post(
        url,
        { id: Number(selectedRow.id) },
        { headers: authHeaders(), validateStatus: () => true }
      );

      const result = res.data;

      if (!result?.success) {
        toast.error(result?.message || 'Failed to delete category');
        return;
      }

      toast.success(result?.message || 'Category deleted');
      setOpenDeleteDialog(false);

      cacheRef.current = {};
      fetchCategories(filters, 1, true);
      setCurrentPage(1);
    } catch (e) {
      toast.error('Error while deleting category.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // UI
  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Notification Categories"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Categories' }]}
          sx={{ mb: 2 }}
        />

        {/* ' Top buttons like CoinPackagesListView */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          <Button variant="contained" onClick={openAdd}>
            <Iconify icon="material-symbols:add" sx={{ width: 20, mr: 1 }} />
            Add
          </Button>
        </Box>
      </Box>

      {/* FILTERS */}
      <Collapse in={showFilter}>
        <Card sx={{ mb: 2, p: 2 }}>
          <Grid container spacing={2} alignItems="center" key={resetFilters}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Category ID"
                placeholder="Type id…"
                value={filters.id || ''}
                onChange={(e) => {
                  const v = String(e.target.value || '').replace(/\D/g, '');
                  setFilters((p) => ({ ...p, id: v }));
                }}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search Category..."
                value={filters.q || ''}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
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
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
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
        </Card>
      </Collapse>

      {/* STATS CARD */}
      <Card
        sx={{
          display: 'flex',
          mb: 2,
          p: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontSize: 14 }}>Total Categories</Typography>
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
            bgcolor: alpha('#16a34a', 0.15),
            color: '#16a34a',
          }}
        >
          <Iconify icon="mdi:shape" />
        </Box>
      </Card>

      {/* TABLE */}
      <Card>
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Created</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>

                    {/* ' Type cell: icon + name with SAME style as coin package name */}
                    <TableCell sx={{ minWidth: 260 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.2,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                            color: 'primary.main',
                          }}
                        >
                          <Iconify icon={row?.icon || 'mdi:tag'} width={18} />
                        </Avatar>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {row?.name || '—'}
                          </Typography>

                          {/* optional secondary line (kept subtle) */}
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {row?.icon ? row.icon : '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Label variant="soft" color={statusColor(row.status)}>
                        {statusLabel(row.status)}
                      </Label>
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
                        <Tooltip title="Edit" placement="top" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={!canEdit(row)}
                              onClick={() => openUpdate(row)}
                            >
                              <Iconify icon="mage:edit-fill" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Delete" placement="top" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!canDelete(row)}
                              onClick={() => openDelete(row)}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" />
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

      {/* ---------------- ADD DIALOG ---------------- */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: (theme) => theme.shadows[24] },
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
              color: 'success.main',
              width: 48,
              height: 48,
            }}
          >
            <Iconify icon="mdi:plus" width={24} />
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Add Category
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a new notification category
            </Typography>
          </Box>

          <IconButton onClick={() => setOpenAddDialog(false)}>
            <Iconify icon="mdi:close" />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Category (A-Z, 0-9, underscore)"
              placeholder="PROMO_OFFER"
              value={addForm.name}
              onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value }))}
              fullWidth
            />

            <IconSelector
              label="Icon (optional)"
              value={addForm.icon}
              onSelect={(icon) => setAddForm((p) => ({ ...p, icon }))}
              placeholder="Search icons... (e.g. heart, bell, chat)"
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={addForm.status}
                label="Status"
                onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            size="large"
            variant="outlined"
            color="inherit"
            onClick={() => setOpenAddDialog(false)}
          >
            Cancel
          </Button>
          <Button
            size="large"
            variant="contained"
            onClick={handleAdd}
            disabled={actionLoading}
            startIcon={
              actionLoading ? (
                <Iconify icon="eos-icons:loading" />
              ) : (
                <Iconify icon="mdi:content-save-check" />
              )
            }
          >
            {actionLoading ? 'Saving...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- UPDATE DIALOG ---------------- */}
      <Dialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: (theme) => theme.shadows[24] },
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
            <Iconify icon="mdi:pencil" width={24} />
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Update Category
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Category #{updateForm.id || selectedRow?.id || '—'}
            </Typography>
          </Box>

          <IconButton onClick={() => setOpenUpdateDialog(false)}>
            <Iconify icon="mdi:close" />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField label="ID" value={updateForm.id} fullWidth disabled />

            <TextField
              label="Category"
              placeholder="SYSTEM_ALERT"
              value={updateForm.name}
              onChange={(e) => setUpdateForm((p) => ({ ...p, type: e.target.value }))}
              fullWidth
            />

            <IconSelector
              label="Icon"
              value={updateForm.icon}
              onSelect={(icon) => setUpdateForm((p) => ({ ...p, icon }))}
              placeholder="Search icons... (e.g. heart, bell, chat)"
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={updateForm.status}
                label="Status"
                onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

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
            onClick={handleUpdate}
            disabled={actionLoading}
            startIcon={
              actionLoading ? (
                <Iconify icon="eos-icons:loading" />
              ) : (
                <Iconify icon="mdi:content-save-check" />
              )
            }
          >
            {actionLoading ? 'Saving...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- DELETE DIALOG ---------------- */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: (theme) => theme.shadows[24] },
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
              color: 'error.main',
              width: 48,
              height: 48,
            }}
          >
            <Iconify icon="mdi:trash" width={24} />
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Delete Category?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will set status to <b>inactive</b>
            </Typography>
          </Box>

          <IconButton onClick={() => setOpenDeleteDialog(false)}>
            <Iconify icon="mdi:close" />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <DialogContent sx={{ p: 3 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
              border: (theme) => `1px dashed ${theme.palette.divider}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedRow?.name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: #{selectedRow?.id || '—'}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            You can re-enable it later by updating status back to <b>active</b>.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            size="large"
            variant="outlined"
            color="inherit"
            onClick={() => setOpenDeleteDialog(false)}
          >
            Cancel
          </Button>
          <Button
            size="large"
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading}
            startIcon={
              actionLoading ? <Iconify icon="eos-icons:loading" /> : <Iconify icon="mdi:trash" />
            }
          >
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

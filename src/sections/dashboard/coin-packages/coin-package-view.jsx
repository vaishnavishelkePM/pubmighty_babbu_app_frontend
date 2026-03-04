'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
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

import { paths } from 'src/routes/paths';

import { fDate, fTime } from 'src/utils/format-time';
import { toText, safeJoin, getSessionToken } from 'src/utils/helper';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LabeledValue from 'src/components/lables/labeled-value';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CoinPackageSelector from 'src/components/selectors/coin-packages-selector';
import { YesNoChip, StatusChip } from 'src/components/chip/coin-package/coin-package';

import AddCoinPackageDialog from './add-coin-package-view';
import EditCoinPackageDialog from './edit-coin-package-view';

const createdAt = (row) => row?.createdAt || row?.created_at || null;

export default function CoinPackagesListView() {
  const router = useRouter();

  const defaultFilters = useMemo(
    () => ({
      id: '',
      name: '',
      google_product_id: '',
      status: '',
      provider: '',
      is_popular: '', // '' | '1' | '0'
      is_ads_free: '', // '' | '1' | '0'
      sortBy: 'display_order',
      sortDir: 'asc',
    }),
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [resetFiltersKey, setResetFiltersKey] = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [reassignToId, setReassignToId] = useState('');
  const [reassignToObj, setReassignToObj] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  //  NEW: Add/Edit Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const {
    control: filterControl,
    handleSubmit: handleFilterSubmit,
    reset: resetFilterForm,
    watch,
  } = useForm({
    defaultValues: defaultFilters,
    mode: 'onBlur',
  });
  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,
      id: String(vals.id || '').trim(),
      name: String(vals.name || ''),
      google_product_id: String(vals.google_product_id || ''),
      status: String(vals.status || ''),
      provider: String(vals.provider || ''),
      is_popular: String(vals.is_popular || ''),
      is_ads_free: String(vals.is_ads_free || ''),
      sortBy: String(vals.sortBy || 'display_order'),
      sortDir: String(vals.sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc',
    };

    setFilters(next);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    resetFilterForm(defaultFilters);
    setResetFiltersKey((x) => x + 1);
  };

  const fetchPackages = async () => {
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

    try {
      setIsLoading(true);
      const url = safeJoin(CONFIG.apiUrl, 'v1/admin/coin-packages');

      const result = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!res?.success) {
        toast.error(res?.msg || res?.message || 'Failed to fetch coin packages');
        return;
      }

      setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while fetching coin packages');
    } finally {
      setIsLoading(false);
    }
  };

  const openView = async (id) => {
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

    try {
      setViewOpen(true);
      setViewLoading(true);
      setSelected(null);

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/${id}`);

      const result = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        setViewOpen(false);
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!res?.success) {
        toast.error(res?.msg || res?.message || 'Failed to fetch coin package');
        return;
      }

      setSelected(res?.data || null);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while fetching coin package');
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const avatarLightbox = useImageLightbox();
  const coverSrc = (cover) => {
    if (!cover) return '';
    if (String(cover).startsWith('http')) return String(cover);
    return safeJoin(CONFIG.assetsUrl, `images/coin-packages/${cover}`);
  };
  const filteredRows = useMemo(() => {
    const f = filters || defaultFilters;
    const idKw = String(f?.id || '').trim();
    const nameKw = String(f?.name || '')
      .trim()
      .toLowerCase();
    const gpKw = String(f?.google_product_id || '')
      .trim()
      .toLowerCase();

    const statusMatch = (v) =>
      !f?.status ? true : String(v || '').toLowerCase() === String(f.status).toLowerCase();
    const providerMatch = (v) =>
      !f?.provider ? true : String(v || '').toLowerCase() === String(f.provider).toLowerCase();

    const boolFlagMatch = (value, flag) => {
      if (flag === '' || flag === null || flag === undefined) return true;
      const vv = value === true || value === 1 || value === '1';
      const want = String(flag) === '1';
      return vv === want;
    };

    let out = rows.filter((r) => {
      if (
        nameKw &&
        !String(r?.name || '')
          .toLowerCase()
          .includes(nameKw)
      )
        return false;
      if (
        gpKw &&
        !String(r?.google_product_id || '')
          .toLowerCase()
          .includes(gpKw)
      )
        return false;
      if (idKw && String(r?.id || '') !== idKw) return false;
      if (!statusMatch(r.status)) return false;
      if (!providerMatch(r.provider)) return false;

      if (!boolFlagMatch(r.is_popular, f.is_popular)) return false;
      if (!boolFlagMatch(r.is_ads_free, f.is_ads_free)) return false;

      return true;
    });

    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const sortBy = f?.sortBy || 'display_order';
    const sortDir = String(f?.sortDir || 'asc').toLowerCase();

    out.sort((a, b) => {
      let av;
      let bv;

      if (sortBy === 'final_price') {
        av = num(a.final_price);
        bv = num(b.final_price);
      } else if (sortBy === 'price') {
        av = num(a.price);
        bv = num(b.price);
      } else if (sortBy === 'coins') {
        av = num(a.coins);
        bv = num(b.coins);
      } else if (sortBy === 'sold_count') {
        av = num(a.sold_count);
        bv = num(b.sold_count);
      } else if (sortBy === 'name') {
        av = String(a.name || '').toLowerCase();
        bv = String(b.name || '').toLowerCase();
      } else if (sortBy === 'id') {
        av = num(a.id);
        bv = num(b.id);
      } else {
        av = num(a.display_order);
        bv = num(b.display_order);
      }

      if (typeof av === 'string' && typeof bv === 'string') {
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, filters, defaultFilters]);

  const openDeleteDialog = (row) => {
    setDeleteRow(row);
    setReassignToId('');
    setReassignToObj(null);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteOpen(false);
    setDeleteRow(null);
    setReassignToId('');
    setReassignToObj(null);
  };

  const confirmDelete = async () => {
    const row = deleteRow;
    if (!row?.id) return;

    if (!reassignToId) {
      toast.error('Please select a coin package to reassign purchases to.');
      return;
    }

    if (String(reassignToId) === String(row.id)) {
      toast.error('Reassign package cannot be the same as the package being deleted.');
      return;
    }

    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    try {
      setDeleteLoading(true);

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/${row.id}/delete`);

      const result = await axios.post(
        url,
        { reassign_to_id: Number(reassignToId) },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      const res = result?.data;

      if (!res?.success) {
        toast.error(res?.msg || res?.message || 'Failed to delete coin package');
        return;
      }

      toast.success(res?.msg || res?.message || 'Coin package deleted');

      setRows((prev) => prev.filter((x) => Number(x.id) !== Number(row.id)));
      if (selected?.id === row.id) {
        setViewOpen(false);
        setSelected(null);
      }

      closeDeleteDialog();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while deleting coin package');
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteDisabled =
    deleteLoading ||
    !deleteRow?.id ||
    !reassignToId ||
    String(reassignToId) === String(deleteRow?.id);

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Coin Packages"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Coin Packages', href: paths?.dashboard?.coinPackages?.root || '#' },
          ]}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          {/*  CHANGED: open Add dialog */}
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            <Iconify icon="material-symbols:add" sx={{ width: 20, mr: 1 }} />
            Add
          </Button>
        </Box>
      </Box>

      {/* ---------------------------------------Filter------------------------------ */}

      <Collapse in={showFilter}>
        <form key={resetFiltersKey} onSubmit={handleFilterSubmit(applyFilters)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Controller
                name="id"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Package ID"
                    placeholder="Enter id…"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="name"
                control={filterControl}
                render={({ field }) => <TextField {...field} label="Package Name" fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="google_product_id"
                control={filterControl}
                render={({ field }) => <TextField {...field} label="Google Product ID" fullWidth />}
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
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Controller
                  name="provider"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Provider" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="google_play">Google Play</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Popular</InputLabel>
                <Controller
                  name="is_popular"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Popular" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Yes</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Ads Free</InputLabel>
                <Controller
                  name="is_ads_free"
                  control={filterControl}
                  render={({ field }) => (
                    <Select {...field} label="Ads Free" value={field.value ?? ''}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Yes</MenuItem>
                      <MenuItem value="0">No</MenuItem>
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
                    <Select {...field} label="Sort By" value={field.value ?? 'display_order'}>
                      <MenuItem value="display_order">Display Order</MenuItem>
                      <MenuItem value="id">ID</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="coins">Coins</MenuItem>
                      <MenuItem value="price">Price</MenuItem>
                      <MenuItem value="final_price">Final Price</MenuItem>
                      <MenuItem value="sold_count">Sold Count</MenuItem>
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
                      value={String(field.value || 'asc').toLowerCase()}
                    >
                      <MenuItem value="asc">ASC</MenuItem>
                      <MenuItem value="desc">DESC</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
            </Grid>
          </Grid>
        </form>
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
        <Box>
          <Typography sx={{ fontSize: 14 }}>Total Packages</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{rows?.length || 0}</Typography>
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
          <Iconify icon="mdi:cash-multiple" />
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
                  <TableCell>Id</TableCell>
                  <TableCell>Package</TableCell>
                  <TableCell>Coins</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Final Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Popular</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Ads Free</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{ width: 100, height: 100, borderRadius: '8px' }}
                          onClick={() => avatarLightbox.open([coverSrc(r.cover)], 0)}
                          variant="rounded"
                          src={coverSrc(r.cover) || undefined}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {r.name || '—'}
                          </Typography>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {r.google_product_id || '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>{toText(r.coins)}</TableCell>
                    <TableCell>
                      {toText(r.currency)} {toText(r.price)}
                    </TableCell>
                    <TableCell>
                      {toText(r.currency)} {toText(r.final_price)}
                    </TableCell>
                    <TableCell>
                      <StatusChip value={r.status} />
                    </TableCell>
                    <TableCell>
                      <YesNoChip value={r.is_popular} yes="Popular" no="No" />
                    </TableCell>
                    <TableCell>
                      <YesNoChip value={r.is_ads_free} yes="Yes" no="No" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 170 }}>
                      <ListItemText
                        primary={createdAt(r) ? fDate(createdAt(r)) : '—'}
                        secondary={createdAt(r) ? fTime(createdAt(r)) : ''}
                        primaryTypographyProps={{ typography: 'body2' }}
                        secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View details">
                          <IconButton size="small" color="primary" onClick={() => openView(r.id)}>
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>

                        {/*  CHANGED: open Edit dialog */}
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setEditId(r.id);
                              setEditOpen(true);
                            }}
                          >
                            <Iconify icon="mage:edit-fill" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDeleteDialog(r)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                <TableNoData notFound={!filteredRows.length} />
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/*  ADD DIALOG (same UI as Add page, but in Dialog) */}
      <AddCoinPackageDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(createdRow) => {
          if (createdRow?.id) {
            setRows((prev) => [createdRow, ...prev]);
          } else {
            fetchPackages();
          }
        }}
      />

      {/*  EDIT DIALOG (same UI as Edit page, but in Dialog) */}
      <EditCoinPackageDialog
        open={editOpen}
        coinPackageId={editId}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        onUpdated={(updatedRow) => {
          if (updatedRow?.id) {
            setRows((prev) =>
              prev.map((x) =>
                String(x.id) === String(updatedRow.id) ? { ...x, ...updatedRow } : x
              )
            );
            if (selected?.id && String(selected.id) === String(updatedRow.id)) {
              setSelected((p) => ({ ...(p || {}), ...updatedRow }));
            }
          } else {
            fetchPackages();
          }
        }}
      />

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteOpen}
        onClose={closeDeleteDialog}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete Coin Package
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2">
            You are deleting <b>{deleteRow?.name ? `"${deleteRow.name}"` : 'this coin package'}</b>.
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Purchases referencing this package will be reassigned to the selected package below.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <CoinPackageSelector
              label="Reassign package to"
              placeholder="Search coin package…"
              statusFilter="active"
              valueId={reassignToId || undefined}
              onSelect={(id, obj) => {
                setReassignToId(id || '');
                setReassignToObj(obj || null);
              }}
            />

            {reassignToId && String(reassignToId) === String(deleteRow?.id) ? (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
                Reassign package cannot be the same as the package being deleted.
              </Typography>
            ) : null}

            {reassignToObj?.id ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.75 }}
              >
                Selected: <b>{reassignToObj?.name}</b> (#{reassignToObj?.id})
              </Typography>
            ) : null}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading} color="inherit">
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleteDisabled}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW DIALOG */}
      {/* VIEW DIALOG - Professional UI Redesign */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            boxShadow: (theme) => theme.customShadows.z24,
            backgroundImage: 'none',
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
          <Stack direction="row" alignItems="center" spacing={2}>
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
              <Iconify icon="solar:box-bold" width={24} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                Coin Package Details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Package ID: #{selected?.id} •{' '}
                {selected?.provider === 'google_play' ? 'Google Play' : selected?.provider}
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={() => setViewOpen(false)} sx={{ color: 'text.disabled' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
          {viewLoading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : !selected ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No data found for this package.
              </Typography>
            </Box>
          ) : (
            <Grid container>
              {/* Left Sidebar - Visuals & Badges */}
              <Grid
                item
                xs={12}
                md={4}
                sx={{
                  p: 3,
                  borderRight: { md: `1px solid ${selected ? 'divider' : 'transparent'}` },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={3} alignItems="center">
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      variant="rounded"
                      onClick={() => avatarLightbox.open([coverSrc(selected.cover)], 0)}
                      src={coverSrc(selected.cover)}
                      sx={{
                        width: 180,
                        height: 180,
                        borderRadius: 2,
                        boxShadow: (theme) => theme.customShadows.z16,
                        border: (theme) => `4px solid ${theme.palette.background.paper}`,
                      }}
                    />
                    {selected.is_popular && (
                      <Chip
                        label="POPULAR"
                        color="warning"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          fontWeight: 800,
                          border: '2px solid white',
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ textAlign: 'center', width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 700 }}>
                      {selected.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {selected.google_product_id}
                    </Typography>

                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <StatusChip value={selected.status} />
                      <YesNoChip
                        value={selected.is_ads_free}
                        yes="Ad-Free Included"
                        no="Standard Version"
                      />
                    </Stack>
                  </Box>

                  <Box sx={{ width: '100%', pt: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: 'block', mb: 1, textTransform: 'uppercase', fontWeight: 700 }}
                    >
                      Package Performance
                    </Typography>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Total Sold
                      </Typography>
                      <Typography variant="subtitle2">{selected.sold_count || 0}</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Grid>

              {/* Right Side - Data Grid */}
              <Grid item xs={12} md={8} sx={{ p: 3 }}>
                <Stack spacing={4}>
                  {/* Pricing Section */}
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.disabled', mb: 2, display: 'block' }}
                    >
                      Revenue & Value
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={4}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.neutral',
                            textAlign: 'center',
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            Coins
                          </Typography>
                          <Typography variant="h5" sx={{ color: 'primary.main' }}>
                            {selected.coins}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.neutral',
                            textAlign: 'center',
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            Base Price
                          </Typography>
                          <Typography variant="h5">
                            {selected.currency} {selected.price}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                            Final Price
                          </Typography>
                          <Typography variant="h5">
                            {selected.currency} {selected.final_price}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Settings & Configuration */}
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.disabled', mb: 2, display: 'block' }}
                    >
                      Configuration Details
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <LabeledValue label="Discount Applied">
                          {selected.discount_type === 'percentage'
                            ? `${selected.discount_value}% Off`
                            : `${selected.currency} ${selected.discount_value} Flat`}
                        </LabeledValue>
                      </Grid>
                      <Grid item xs={6}>
                        <LabeledValue label="Validity Period">
                          {selected.validity_days ? `${selected.validity_days} Days` : 'Lifetime'}
                        </LabeledValue>
                      </Grid>
                      <Grid item xs={6}>
                        <LabeledValue label="Display Order">
                          Rank #{selected.display_order}
                        </LabeledValue>
                      </Grid>
                      <Grid item xs={6}>
                        <LabeledValue label="Created Date">
                          {fDate(createdAt(selected))}
                        </LabeledValue>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Description Section */}
                  {selected.description && (
                    <Box
                      sx={{ p: 2, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider' }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Internal Description
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
                        {selected.description}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setViewOpen(false)}
            sx={{ px: 4 }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => {
              const id = selected?.id;
              if (!id) return;
              setViewOpen(false);
              setEditId(id);
              setEditOpen(true);
            }}
            disabled={!selected}
            sx={{ px: 4 }}
          >
            Modify Package
          </Button>
        </DialogActions>
      </Dialog>
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
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
  Tooltip,
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
  DialogTitle,
  DialogActions,
  DialogContent,
  PaginationItem,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { getSessionToken } from 'src/utils/helper';
import { safeJoin, buildQuery } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function AdView() {
  const router = useRouter();

  const defaultFilters = useMemo(
    () => ({
      status: '',
      provider_name: '',
      sortBy: 'id',
      sortDir: 'asc',
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;
  const cacheRef = useRef({});

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const statusChip = (value) => (
    <Chip
      label={value ? 'Active' : 'Inactive'}
      size="small"
      variant="outlined"
      sx={(theme) => ({
        fontWeight: 700,
        borderWidth: 2,
        borderColor: value ? theme.palette.success.main : theme.palette.error.main,
        color: value ? theme.palette.success.main : theme.palette.error.main,
        backgroundColor: 'transparent',
      })}
    />
  );

  const fetchDistributions = useCallback(
    async (nextFilters, hardReload = false) => {
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

      const qs = buildQuery(nextFilters);
      const queryKey = qs || 'ALL';

      if (cacheRef.current[queryKey] && !hardReload) {
        setRows(cacheRef.current[queryKey]);
        return;
      }

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/ad-distribution?${qs}`);
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
          toast.error(res?.msg || res?.message || `Failed (HTTP ${result.status})`);
          return;
        }

        const list = res?.data?.distributions ?? [];
        cacheRef.current[queryKey] = list;
        setRows(list);
      } catch (error) {
        console.error('fetchDistributions NETWORK error:', error);
        toast.error(
          `Network/CORS error. URL: ${safeJoin(CONFIG.apiUrl, `/v1/admin/ad-distribution`)}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchDistributions(defaultFilters, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter form
  const {
    control: filterControl,
    handleSubmit: handleFilterSubmit,
    reset: resetFilterForm,
  } = useForm({ defaultValues: defaultFilters, mode: 'onBlur' });

  // Edit form
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    watch: watchEdit,
  } = useForm({
    defaultValues: { starting_percentage: '', ending_percentage: '', status: '' },
  });

  const editStarting = watchEdit('starting_percentage');
  const editEnding = watchEdit('ending_percentage');

  // Sync edit form when row changes
  useEffect(() => {
    if (!editRow) return;
    resetEditForm({
      starting_percentage:
        typeof editRow.starting_percentage !== 'undefined'
          ? String(editRow.starting_percentage)
          : '',
      ending_percentage:
        typeof editRow.ending_percentage !== 'undefined' ? String(editRow.ending_percentage) : '',
      status: typeof editRow.status !== 'undefined' ? (editRow.status ? 'true' : 'false') : '',
    });
  }, [editRow, resetEditForm]);

  const applyFilters = (vals) => {
    const next = {
      ...defaultFilters,
      ...vals,
      status:
        vals.status === '' || vals.status == null
          ? ''
          : vals.status === 1 || vals.status === '1'
            ? true
            : vals.status === 0 || vals.status === '0'
              ? false
              : '',
      provider_name: (vals.provider_name || '').trim(),
    };
    setFilters(next);
    setCurrentPage(1);
    cacheRef.current = {};
    fetchDistributions(next, true);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
    resetFilterForm(defaultFilters);
    cacheRef.current = {};
    fetchDistributions(defaultFilters, true);
  };

  const hardRefresh = () => {
    cacheRef.current = {};
    fetchDistributions(filters, true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const submitEdit = async (vals) => {
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

    const payload = { id: Number(editRow?.id) };

    if (vals.starting_percentage !== '' && vals.starting_percentage != null)
      payload.starting_percentage = Number(vals.starting_percentage);

    if (vals.ending_percentage !== '' && vals.ending_percentage != null)
      payload.ending_percentage = Number(vals.ending_percentage);

    if (vals.status !== '' && vals.status != null) payload.status = vals.status === 'true';

    if (
      typeof payload.starting_percentage !== 'undefined' &&
      typeof payload.ending_percentage !== 'undefined' &&
      payload.starting_percentage > payload.ending_percentage
    ) {
      toast.error('Starting % cannot be greater than Ending %');
      return;
    }

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/ad-distribution/edit`);
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

      const updatedRow = res?.data || editRow;
      setRows((prev) => prev.map((r) => (Number(r.id) === Number(updatedRow.id) ? updatedRow : r)));
      cacheRef.current = {};
      handleCloseEdit();
      toast.success('Updated successfully');
    } catch (error) {
      console.error('editAdDistribution NETWORK error:', error);
      toast.error('Network error while updating');
    }
  };

  const totalItems = rows?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
  const pageRows = rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Ad Distribution"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Ad Distribution', href: paths.dashboard?.settings?.adDistribution || '#' },
          ]}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>
          <Button variant="outlined" onClick={hardRefresh} disabled={isLoading}>
            <Iconify icon="solar:refresh-bold" sx={{ width: 20, mr: 1 }} />
            Refresh
          </Button>
        </Box>
      </Box>

      {/* FILTERS */}
      <Collapse in={showFilter}>
        <form onSubmit={handleFilterSubmit(applyFilters)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Controller
                name="provider_name"
                control={filterControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Provider"
                    placeholder="e.g. AdMob"
                    value={field.value ?? ''}
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
                      <MenuItem value="true">Active</MenuItem>
                      <MenuItem value="false">Inactive</MenuItem>
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
          <Typography sx={{ fontSize: 14 }}>Total Rows</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{totalItems}</Typography>
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
          <Iconify icon="mdi:percent" />
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
                  <TableCell>Provider</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Starting %</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Ending %</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Range</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows?.map((row) => {
                  const start = Number(row?.starting_percentage ?? 0);
                  const end = Number(row?.ending_percentage ?? 0);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row?.provider_name || '—'}</TableCell>
                      <TableCell>
                        <Chip label={`${start}%`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={`${end}%`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{statusChip(!!row.status)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {start}% → {end}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setEditRow(row);
                                setEditOpen(true);
                              }}
                            >
                              <Iconify icon="mage:edit-fill" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={totalItems === 0} />
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
          count={totalPages}
          page={currentPage}
          onChange={(_, p) => setCurrentPage(p)}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* EDIT DIALOG — inline, no separate component */}
      <Dialog
        fullWidth
        maxWidth="sm"
        open={editOpen}
        onClose={handleCloseEdit}
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
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Ad Distribution</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="starting_percentage"
              control={editControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Starting Percentage"
                  placeholder="0 - 100"
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  helperText={editStarting !== '' ? `Current: ${editStarting}%` : ''}
                />
              )}
            />
            <Controller
              name="ending_percentage"
              control={editControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ending Percentage"
                  placeholder="0 - 100"
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  helperText={editEnding !== '' ? `Current: ${editEnding}%` : ''}
                />
              )}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Controller
                name="status"
                control={editControl}
                render={({ field }) => (
                  <Select {...field} label="Status" value={field.value ?? ''}>
                    <MenuItem value="">No Change</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Preview Range
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {editStarting || editRow?.starting_percentage || 0}% →{' '}
                {editEnding || editRow?.ending_percentage || 0}%
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={handleCloseEdit}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditSubmit(submitEdit)}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

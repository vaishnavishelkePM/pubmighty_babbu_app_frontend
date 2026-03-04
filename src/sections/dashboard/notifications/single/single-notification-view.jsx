'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Card,
  Grid,
  Table,
  Stack,
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
import { getCookie, formatDateTime } from 'src/utils/helper';
import { pickDate, getIconSrc } from 'src/utils/notification-helper';
import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import LoadingPopup from 'src/components/popup/loading-popup';
import UserSelector from 'src/components/selectors/user-selector';
import TableSkeleton from 'src/components/skeletons/table-skeleton';
import AdminSelector from 'src/components/selectors/admin-selector';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import NotificationCategorySelector from 'src/components/selectors/notification-category-selector';
import {
  statusChip,
  sortOptions,
  priorityChip,
  STATUS_OPTIONS_VIEW,
} from 'src/components/chip/notification/notification_chip';

import AddSingleNotificationDialog from './add-single-notification';

// ----------------------------------------------------------------------

export default function SingleNotificationsView() {
  const session_key = getCookie('session_key');
  const notificationsListBase = `${CONFIG.apiUrl}/v1/admin/notifications/user`;

  const defaultFilters = useMemo(
    () => ({
      page: 1,
      limit: 10,
      receiver_id: '',
      id: '',
      sender_id: '',

      status: '',
      title: '',
      content: '',
      created_from: '',
      created_to: '',
      sortBy: 'created_at',
      order: 'DESC',
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [resetFilters, setResetFilters] = useState(1);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 50,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const cacheRef = useRef({});

  const [selectedRow, setSelectedRow] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [kpi, setKpi] = useState({
    total_notifications: 0,
    total_draft_notifications: 0,
    total_scheduled_notifications: 0,
    total_sent_notifications: 0,
  });

  const [kpiLoading, setKpiLoading] = useState(false);

  const getAvatarBust = (obj) => {
    if (!obj) return Date.now();
    return (
      obj.updatedAt ||
      obj.updated_at ||
      obj.modified ||
      obj.createdAt ||
      obj.created_at ||
      Date.now()
    );
  };
  const avatarLightbox = useImageLightbox();
  const getAdminAvatarSrc = (admin) => {
    const file = admin?.avatar;
    if (!file) return '';
    const v = getAvatarBust(admin);
    return `${CONFIG.assetsUrl}/uploads/avatar/admin/${file}?v=${encodeURIComponent(v)}`;
  };

  const getUserAvatarSrc = (user) => {
    const file = user?.avatar;
    if (!file) return '';
    const v = getAvatarBust(user);
    return `${CONFIG.assetsUrl}/uploads/avatar/user/${file}?v=${encodeURIComponent(v)}`;
  };
  const fetchKpi = useCallback(async () => {
    if (!session_key) return;

    try {
      setKpiLoading(true);

      const url = `${CONFIG.apiUrl}/v1/admin/notifications/user/kpi`;

      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${session_key}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      });

      const result = res.data;

      if (result?.success) {
        setKpi({
          total_notifications: Number(result?.data?.total_notifications || 0),
          total_draft_notifications: Number(result?.data?.total_draft_notifications || 0),
          total_scheduled_notifications: Number(result?.data?.total_scheduled_notifications || 0),
          total_sent_notifications: Number(result?.data?.total_sent_notifications || 0),
        });
      } else {
        toast.error(result?.message || 'Failed to fetch KPI');
      }
    } catch (err) {
      console.error('fetchKpi error:', err);
      toast.error('Error while loading KPI.');
    } finally {
      setKpiLoading(false);
    }
  }, [session_key]);

  const fetchNotifications = useCallback(
    async (filter, page = 1, hardReload = false) => {
      setLoading(true);

      const filterWithPage = {
        ...filter,
        page,
        limit: filter.limit || 50,
      };

      const queryKey = (() => {
        const qp = new URLSearchParams();

        if (filterWithPage) {
          Object.entries(filterWithPage).forEach(([k, v]) => {
            if (v !== '' && v !== null && v !== undefined) qp.append(k, v);
          });
        }

        return qp.toString();
      })();
      const cacheKey = `${notificationsListBase}::${queryKey}`;

      if (cacheRef.current[cacheKey] && !hardReload) {
        const cached = cacheRef.current[cacheKey];
        setRows(cached.rows);
        setPagination(cached.pagination);
        setLoading(false);
        return;
      }

      try {
        const url = `${notificationsListBase}?${queryKey}`;

        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${session_key}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        });

        const result = res.data;

        if (result?.success) {
          const r = result?.data?.notifications ?? [];
          const pag = result?.data?.pagination ?? {};

          const normalizedPagination = {
            totalRecords: pag.totalItems ?? 0,
            totalPages: pag.totalPages ?? 0,
            currentPage: pag.currentPage ?? page,
            pageSize: pag.perPage ?? filterWithPage.limit ?? 50,
          };

          // Filter only single (has receiver)
          const filteredRows = r.filter((x) => !!x?.receiver);

          setRows(filteredRows);
          setPagination(normalizedPagination);

          cacheRef.current[cacheKey] = {
            rows: filteredRows,
            pagination: normalizedPagination,
          };
        } else {
          toast.error(result?.message || result?.msg || 'Failed to fetch notifications');
        }
      } catch (err) {
        console.error('fetchNotifications error:', err);
        toast.error('Error while loading notifications.');
      } finally {
        setLoading(false);
      }
    },
    [notificationsListBase, session_key]
  );

  useEffect(() => {
    setCurrentPage(1);
    cacheRef.current = {};
    fetchNotifications(filters, 1, true);
    fetchKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterApply = () => {
    setCurrentPage(1);
    cacheRef.current = {};
    fetchNotifications(filters, 1, true);
  };

  const handleFilterReset = () => {
    setCurrentPage(1);
    setFilters(defaultFilters);
    cacheRef.current = {};
    setResetFilters((x) => x + 1);
    fetchNotifications(defaultFilters, 1, true);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    fetchNotifications(filters, p);
  };

  const openViewFor = (row) => {
    setSelectedRow(row);
    setOpenViewDialog(true);
  };

  const scheduledAt = (row) => pickDate(row, 'scheduledAt', 'scheduled_at');
  const sentAt = (row) => pickDate(row, 'sentAt', 'sent_at');

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <CustomBreadcrumbs
          heading="Single User Notifications"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Notifications', href: paths.dashboard.notifications.root },
            { name: 'Single User' },
          ]}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mr: '10px', mb: '16px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => setShowFilter((p) => !p)}>
            <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </Button>

          <Button variant="contained" onClick={() => setOpenAddDialog(true)}>
            <Iconify icon="ic:baseline-plus" sx={{ mr: 1 }} />
            Send to User
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilter} timeout="auto">
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2} alignItems="center" key={resetFilters}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Notification ID"
                value={filters.id}
                onChange={(e) => setFilters((p) => ({ ...p, id: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <UserSelector
                label="Receiver User"
                placeholder="Search user"
                valueId={filters.receiver_id ? Number(filters.receiver_id) : undefined}
                onUserSelect={(id) => {
                  setFilters((p) => ({ ...p, receiver_id: id ? String(id) : '' }));
                }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AdminSelector
                label="Sender Admin"
                placeholder="Search admin by username..."
                valueId={filters.sender_id ? Number(filters.sender_id) : undefined}
                onAdminSelect={(id) => {
                  setFilters((p) => ({ ...p, sender_id: id ? String(id) : '' }));
                }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <NotificationCategorySelector
                label="Category"
                placeholder="Search category..."
                valueId={filters.category_id ? Number(filters.category_id) : undefined}
                statusFilter="active" // optional: only active categories
                onCategorySelect={(id) => {
                  setFilters((p) => ({ ...p, category_id: id ? String(id) : '' }));
                }}
                fullWidth
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
                  {STATUS_OPTIONS_VIEW.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Title"
                value={filters.title}
                onChange={(e) => setFilters((p) => ({ ...p, title: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Content"
                value={filters.content}
                onChange={(e) => setFilters((p) => ({ ...p, content: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Created From"
                value={filters.created_from ? dayjs(filters.created_from) : null}
                onChange={(newValue) =>
                  setFilters((p) => ({
                    ...p,
                    created_from: newValue ? newValue.format('YYYY-MM-DD') : '',
                  }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Created To"
                value={filters.created_to ? dayjs(filters.created_to) : null}
                onChange={(newValue) =>
                  setFilters((p) => ({
                    ...p,
                    created_to: newValue ? newValue.format('YYYY-MM-DD') : '',
                  }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Sort By"
                  onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
                >
                  {sortOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
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

            <Grid
              item
              xs={12}
              md={6}
              sx={{
                gap: 1,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Button variant="contained" onClick={handleFilterApply} fullWidth sx={{ height: 50 }}>
                Apply
              </Button>
              <Button variant="outlined" onClick={handleFilterReset} fullWidth sx={{ height: 50 }}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Collapse>

      {/* KPI Card */}
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2, mt: 2 }}>
        {/* TOTAL */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                }}
              >
                <Iconify icon="mdi:bell-outline" width={26} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                  {kpiLoading ? '—' : kpi.total_notifications}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* DRAFT */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.200',
                  color: 'grey.800',
                }}
              >
                <Iconify icon="mdi:file-document-edit-outline" width={26} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  DRAFT
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                  {kpiLoading ? '—' : kpi.total_draft_notifications}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* SCHEDULED */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'info.lighter',
                  color: 'info.main',
                }}
              >
                <Iconify icon="mdi:clock-outline" width={26} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  SCHEDULED
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                  {kpiLoading ? '—' : kpi.total_scheduled_notifications}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* SENT */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'success.lighter',
                  color: 'success.main',
                }}
              >
                <Iconify icon="mdi:send-check-outline" width={26} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  SENT
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                  {kpiLoading ? '—' : kpi.total_sent_notifications}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton cols={9} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={70}>ID</TableCell>
                  <TableCell>Notification</TableCell>
                  <TableCell width={220}>Receiver </TableCell>
                  <TableCell width={220}>Sender </TableCell>
                  <TableCell width={220}>Category</TableCell>
                  <TableCell width={140}>Status</TableCell>
                  <TableCell width={120}>Priority</TableCell>
                  <TableCell width={170}>Scheduled</TableCell>
                  <TableCell width={170}>Sent</TableCell>
                  <TableCell align="center" width={120}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows?.map((row) => {
                  const st = statusChip(row.status);
                  const pr = priorityChip(row.priority);
                  const recv = row.receiver;
                  const send = row.senderAdmin;
                  const scheduled = scheduledAt(row);
                  const sent = sentAt(row);

                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>

                      <TableCell sx={{ minWidth: 340 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            src={getIconSrc(row)}
                            onClick={() => avatarLightbox.open([getIconSrc(row)], 0)}
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 1,
                              bgcolor: 'background.neutral',
                            }}
                            imgProps={{
                              onError: (e) => {
                                e.currentTarget.style.display = 'none';
                              },
                            }}
                          >
                            <Iconify icon="mdi:bell" />
                          </Avatar>
                          <ListItemText
                            primary={
                              <Tooltip title={row.title || '—'} placement="top" arrow>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 340,
                                  }}
                                >
                                  {row.title || '—'}
                                </span>
                              </Tooltip>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {row.content?.substring(0, 70)}
                                {row.content?.length > 70 ? '...' : ''}
                              </Typography>
                            }
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {recv ? (
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              onClick={() => avatarLightbox.open([getUserAvatarSrc(recv)], 0)}
                              src={getUserAvatarSrc(recv)}
                              sx={{ width: 34, height: 34 }}
                            >
                              {recv.full_name?.[0]?.toUpperCase() || recv.email?.[0]?.toUpperCase()}
                            </Avatar>

                            <Stack spacing={0} sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {recv.full_name || `User #${recv.id}`}
                              </Typography>

                              <Typography variant="caption" color="text.secondary" noWrap>
                                {recv.email || '—'}
                              </Typography>
                            </Stack>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {send ? (
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              onClick={() => avatarLightbox.open([getAdminAvatarSrc(send)], 0)}
                              src={getAdminAvatarSrc(send)}
                              sx={{ width: 34, height: 34 }}
                            >
                              {send.username?.[0]?.toUpperCase()}
                            </Avatar>

                            <Stack spacing={0} sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                {send.username || `Admin #${send.id}`}
                              </Typography>

                              <Typography variant="caption" color="text.secondary" noWrap>
                                {send.email || '—'}
                              </Typography>
                            </Stack>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            System
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {row.category ? (
                          <Label
                            variant="soft"
                            color={row.category?.status === 'active' ? 'primary' : 'default'}
                            sx={{ textTransform: 'uppercase', fontWeight: 700 }}
                          >
                            {row.category?.name}
                          </Label>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Label variant="soft" color={st.color} sx={{ textTransform: 'uppercase' }}>
                          {st.label}
                        </Label>
                      </TableCell>

                      <TableCell>
                        <Label variant="soft" color={pr.color} sx={{ textTransform: 'uppercase' }}>
                          {pr.label}
                        </Label>
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {scheduled ? (
                          <ListItemText
                            primary={fDate(scheduled)}
                            secondary={fTime(scheduled)}
                            primaryTypographyProps={{ typography: 'body2' }}
                            secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {sent ? (
                          <ListItemText
                            primary={fDate(sent)}
                            secondary={fTime(sent)}
                            primaryTypographyProps={{ typography: 'body2' }}
                            secondaryTypographyProps={{ mt: 0.5, component: 'span' }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" alignItems="center" justifyContent="center">
                          <Tooltip title="View Details" placement="top" arrow>
                            <IconButton color="primary" onClick={() => openViewFor(row)}>
                              <Iconify icon="mdi:eye" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableNoData notFound={(pagination?.totalRecords ?? 0) === 0} />
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
          count={Math.max(1, Number(pagination?.totalPages || 1))}
          page={currentPage}
          onChange={(e, p) => handlePageChange(p)}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Stack>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        fullWidth
        maxWidth="lg"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: {
            borderRadius: 3,
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
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.neutral',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: { xs: 35, sm: 45 },
                height: { xs: 32, sm: 45 },
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.lighter',
                color: 'success.main',
              }}
            >
              <Iconify icon="mdi:account-bell" width={{ xs: 20, sm: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                Single User Notification
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontWeight: 600, textTransform: 'uppercase' }}
              >
                ID: #{selectedRow?.id} • {selectedRow?.type}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setOpenViewDialog(false)}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* LEFT SIDE */}
          <Box
            sx={{
              p: 4,
              flexGrow: 1,
              borderRight: (theme) => ({ md: `1px solid ${theme.palette.divider}` }),
            }}
          >
            <Stack spacing={4}>
              {/* Message Content */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', mb: 1.5, display: 'block' }}
                >
                  Message Content
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    bgcolor: 'background.neutral',
                    borderRadius: 2,
                    borderStyle: 'dashed',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, mb: 1, color: 'success.main' }}
                  >
                    {selectedRow?.title || 'Untitled'}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {selectedRow?.content || 'No content provided.'}
                  </Typography>
                </Paper>
              </Box>

              {/* Statistics */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', mb: 2, display: 'block' }}
                >
                  Delivery Statistics
                </Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      label: 'Delivered',
                      val: selectedRow?.total_delivered || 1,
                      color: 'success',
                    },
                    { label: 'Clicked', val: selectedRow?.total_clicked, color: 'warning' },
                    { label: 'Failed', val: selectedRow?.total_failed, color: 'error' },
                  ].map((stat) => (
                    <Grid item xs={4} key={stat.label}>
                      <Stack
                        spacing={0.5}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: 900 }}>
                          {stat.val || 0}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.disabled', fontWeight: 800 }}
                        >
                          {stat.label.toUpperCase()}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Stack>
          </Box>

          {/* RIGHT SIDE */}
          <Box sx={{ p: 4, width: { xs: '100%', md: 350 }, bgcolor: 'background.neutral' }}>
            <Stack spacing={4}>
              {/* Receiver Profile */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', display: 'block', mb: 2 }}
                >
                  Receiver User
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    boxShadow: (theme) => theme.customShadows.card,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={getUserAvatarSrc(selectedRow?.receiver)}
                      sx={{
                        width: 52,
                        height: 52,
                        border: (theme) => `2px solid ${theme.palette.success.lighter}`,
                      }}
                    >
                      {selectedRow?.receiver?.full_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
                        {selectedRow?.receiver?.full_name || 'User'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: 'block' }}
                      >
                        {selectedRow?.receiver?.email || '—'}
                      </Typography>
                      <Label
                        color="success"
                        variant="soft"
                        sx={{ height: 20, fontSize: 10, mt: 0.5 }}
                      >
                        USER
                      </Label>
                    </Box>
                  </Stack>
                </Paper>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {/* Sender Profile */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', display: 'block', mb: 2 }}
                >
                  Sender Admin
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    boxShadow: (theme) => theme.customShadows.card,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={getAdminAvatarSrc(selectedRow?.senderAdmin)}
                      sx={{
                        width: 52,
                        height: 52,
                        border: (theme) => `2px solid ${theme.palette.primary.lighter}`,
                      }}
                    >
                      {selectedRow?.senderAdmin?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
                        {selectedRow?.senderAdmin?.username || 'System'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: 'block' }}
                      >
                        {selectedRow?.senderAdmin?.email || 'noreply@system.com'}
                      </Typography>
                      <Label
                        color="primary"
                        variant="soft"
                        sx={{ height: 20, fontSize: 10, mt: 0.5 }}
                      >
                        ADMIN
                      </Label>
                    </Box>
                  </Stack>
                </Paper>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {/* Logistics */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', display: 'block', mb: 2 }}
                >
                  Logistics
                </Typography>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontWeight: 700, display: 'block' }}
                    >
                      STATUS
                    </Typography>
                    <Label
                      color={statusChip(selectedRow?.status).color}
                      variant="filled"
                      sx={{ mt: 0.5 }}
                    >
                      {statusChip(selectedRow?.status).label}
                    </Label>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontWeight: 700, display: 'block' }}
                    >
                      PRIORITY
                    </Typography>
                    <Label
                      color={priorityChip(selectedRow?.priority).color}
                      variant="soft"
                      sx={{ mt: 0.5 }}
                    >
                      {selectedRow?.priority?.toUpperCase() || 'NORMAL'}
                    </Label>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontWeight: 700, display: 'block' }}
                    >
                      SENT AT
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {sentAt(selectedRow) ? formatDateTime(sentAt(selectedRow)) : 'Not sent yet'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {/* Assets */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.disabled', display: 'block', mb: 2 }}
                >
                  Visual & Redirect
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
                      LANDING URL
                    </Typography>
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: 'primary.main',
                        display: 'block',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        selectedRow?.landing_url && window.open(selectedRow.landing_url, '_blank')
                      }
                    >
                      {selectedRow?.landing_url || 'No URL'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            gap: 1.5,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Button variant="outlined" color="inherit" onClick={() => setOpenViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <AddSingleNotificationDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSuccess={() => {
          setOpenAddDialog(false);
          cacheRef.current = {};
          fetchNotifications(filters, currentPage, true);
        }}
      />

      <LoadingPopup open={actionLoading} message="Processing..." />
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

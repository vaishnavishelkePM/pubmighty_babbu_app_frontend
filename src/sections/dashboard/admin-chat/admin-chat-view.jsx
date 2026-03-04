'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Grid,
  Stack,
  Table,
  Button,
  Select,
  Avatar,
  Tooltip,
  Collapse,
  MenuItem,
  TableRow,
  TextField,
  TableCell,
  TableBody,
  TableHead,
  InputLabel,
  IconButton,
  Pagination,
  Typography,
  FormControl,
  TableContainer,
  PaginationItem,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { ImageLightbox, useImageLightbox } from 'src/utils/image-preview-helper';
import { apiUrl, formatDay, formatTime, getSessionToken } from 'src/utils/helper';

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
} from 'src/components/chip/admin-chat.jsx/chat-chips';

import AdminChatChats from './admin-chat-chats';
import AdminChatMessages from './admin-chat-messeges';

const API = {
  USERS: '/v1/admin/chats/users',
  CHATS: '/v1/admin/chats',
  MSG_CURSOR: (chatId) => `/v1/admin/chats/${chatId}/messages/cursor`,
  DELETE_MSG: (messageId) => `/v1/admin/messages/${messageId}/delete`,
};

export default function AdminChatView() {
  const router = useRouter();
  const theme = useTheme();
  const avatarLightbox = useImageLightbox();
  const getAvatarUrl = useCallback((user) => {
    const file = user?.avatar;
    if (!file) return '';
    if (String(file).startsWith('http')) return file;
    return `${String(CONFIG.assetsUrl || '').replace(/\/+$/, '')}/uploads/avatar/user/${file}`;
  }, []);

  const buildFileCandidates = useCallback((file) => {
    const folders = String(file?.folders || '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    const name = String(file?.name || '').replace(/^\/+/, '');
    if (!name) return [];

    if (name.startsWith('http')) return [name];

    const base = String(CONFIG.assetsUrl || '').replace(/\/+$/, '');
    const c = [];

    if (folders) c.push(`${base}/uploads/${folders}/${name}`);
    if (folders) c.push(`${base}/${folders}/${name}`);

    if (folders) c.push(`${base}/uploads/chat/${folders}/${name}`);
    if (folders) c.push(`${base}/uploads/message/${folders}/${name}`);
    if (folders) c.push(`${base}/uploads/messages/${folders}/${name}`);

    c.push(`${base}/uploads/chat/${name}`);
    c.push(`${base}/uploads/message/${name}`);
    c.push(`${base}/uploads/messages/${name}`);
    c.push(`${base}/uploads/${name}`);

    return Array.from(new Set(c.filter(Boolean)));
  }, []);

  const ensureAuth = useCallback(() => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return null;
    }
    return token;
  }, [router]);

  const [mode, setMode] = useState('users');

  const defaultUsersFilters = useMemo(
    () => ({
      status: '',
      is_active: '',
      is_verified: '',
      include_deleted: false,
      email: '',
      phone: '',
      full_name: '',
      country: '',
      gender: '',
      register_type: '',
      type: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
    }),
    []
  );

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUsersFilter, setShowUsersFilter] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    perPage: 20,
  });

  const {
    control: usersControl,
    handleSubmit: usersHandleSubmit,
    reset: usersReset,
  } = useForm({
    defaultValues: defaultUsersFilters,
    mode: 'onBlur',
  });

  const buildUsersQuery = useCallback((vals, page) => {
    const q = new URLSearchParams();
    q.set('page', String(page || 1));

    // exact fields
    if (vals.status !== '') q.set('status', String(vals.status));
    if (vals.is_active !== '') q.set('is_active', String(vals.is_active));
    if (vals.is_verified !== '') q.set('is_verified', String(vals.is_verified));
    q.set('include_deleted', vals.include_deleted ? 'true' : 'false');

    // text
    if ((vals.email || '').trim()) q.set('email', String(vals.email).trim());
    if ((vals.phone || '').trim()) q.set('phone', String(vals.phone).trim());
    if ((vals.full_name || '').trim()) q.set('full_name', String(vals.full_name).trim());
    if ((vals.country || '').trim()) q.set('country', String(vals.country).trim());
    if ((vals.gender || '').trim()) q.set('gender', String(vals.gender).trim());
    if ((vals.register_type || '').trim())
      q.set('register_type', String(vals.register_type).trim());
    if ((vals.type || '').trim()) q.set('type', String(vals.type).trim());

    q.set('sortBy', String(vals.sortBy || 'created_at'));
    q.set('sortOrder', String(vals.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    return q.toString();
  }, []);

  const fetchUsers = useCallback(
    async ({ page = 1, values = defaultUsersFilters } = {}) => {
      const token = ensureAuth();
      if (!token) return;

      const url = apiUrl(`${API.USERS}?${buildUsersQuery(values, page)}`);

      try {
        setUsersLoading(true);

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        });

        if (res.status === 401 || res.status === 403) {
          toast.error(res?.data?.msg || res?.data?.message || 'Unauthorized');
          router.push(paths?.auth?.login || '/login');
          return;
        }

        if (!res?.data?.success) {
          toast.error(res?.data?.msg || 'Failed to fetch users');
          return;
        }

        const items = res?.data?.data?.items || [];
        const pag = res?.data?.data?.pagination || {};

        setUsers(items);
        setUsersPagination({
          totalItems: pag.totalItems || 0,
          totalPages: pag.totalPages || 1,
          currentPage: pag.currentPage || page,
          perPage: pag.perPage || 20,
        });
        setUsersPage(page);
      } catch (e) {
        console.error(e);
        toast.error('Network error while fetching users');
      } finally {
        setUsersLoading(false);
      }
    },
    [ensureAuth, router, buildUsersQuery, defaultUsersFilters]
  );

  const applyUsersFilters = (vals) => {
    fetchUsers({ page: 1, values: { ...defaultUsersFilters, ...vals } });
    setUsersPage(1);
  };

  const resetUsersFilters = () => {
    usersReset(defaultUsersFilters);
    setUsersPage(1);
    setTimeout(() => fetchUsers({ page: 1, values: defaultUsersFilters }), 0);
  };

  const [selectedUser, setSelectedUser] = useState(null);

  // ================= CHATS =================
  const [chats, setChats] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPage, setChatPage] = useState(1);
  const [chatPagination, setChatPagination] = useState({ totalPages: 1, total: 0 });

  const [showChatsFilter, setShowChatsFilter] = useState(false);

  const defaultChatsFilters = useMemo(
    () => ({
      chatId: '',
      status: '',
    }),
    []
  );

  const {
    control: chatsControl,
    handleSubmit: chatsHandleSubmit,
    reset: chatsReset,
  } = useForm({
    defaultValues: defaultChatsFilters,
    mode: 'onBlur',
  });

  const fetchChats = useCallback(
    async ({ page = 1, userId, values = defaultChatsFilters } = {}) => {
      const token = ensureAuth();
      if (!token) return;

      const uid = Number(userId || selectedUser?.id || 0);
      if (!uid) return;

      const qs = new URLSearchParams();
      qs.set('page', String(page || 1));
      qs.set('limit', '20');
      qs.set('userId', String(uid));

      const chatId = String(values.chatId || '').trim();
      const status = String(values.status || '').trim();
      if (chatId) qs.set('chatId', chatId);
      if (status) qs.set('status', status);

      const url = apiUrl(`${API.CHATS}?${qs.toString()}`);

      try {
        setChatLoading(true);

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        });

        if (res.status === 401 || res.status === 403) {
          toast.error(res?.data?.message || 'Unauthorized');
          router.push(paths?.auth?.login || '/login');
          return;
        }

        if (!res?.data?.success) {
          toast.error(res?.data?.message || 'Failed to fetch chats');
          return;
        }

        setChats(res?.data?.data?.chats || []);
        setChatPagination(res?.data?.data?.pagination || {});
        setChatPage(page);
      } catch (e) {
        console.error(e);
        toast.error('Network error while fetching chats');
      } finally {
        setChatLoading(false);
      }
    },
    [ensureAuth, router, selectedUser, defaultChatsFilters]
  );

  const applyChatsFilters = (vals) => {
    setChatPage(1);
    fetchChats({ page: 1, userId: selectedUser?.id, values: { ...defaultChatsFilters, ...vals } });
  };

  const resetChatsFilters = () => {
    chatsReset(defaultChatsFilters);
    setChatPage(1);
    setTimeout(
      () => fetchChats({ page: 1, userId: selectedUser?.id, values: defaultChatsFilters }),
      0
    );
  };

  // ================= MESSAGES =================
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchMessagesCursor = async ({ chatId, nextCursor = null, appendOlder = false }) => {
    const token = ensureAuth();
    if (!token) return;

    const q = new URLSearchParams();
    q.set('limit', '30');
    if (nextCursor) q.set('cursor', String(nextCursor));

    const url = apiUrl(`${API.MSG_CURSOR(chatId)}?${q.toString()}`);

    try {
      setMsgLoading(true);

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to fetch messages');
        return;
      }

      const newMsgs = res?.data?.data?.messages || [];
      const next = res?.data?.data?.cursor ?? null;
      const more = Boolean(res?.data?.data?.hasMore);

      setCursor(next);
      setHasMore(more);
      setMessages((prev) => (appendOlder ? [...newMsgs, ...prev] : newMsgs));
    } catch (e) {
      console.error(e);
      toast.error('Network error while fetching messages');
    } finally {
      setMsgLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    const token = ensureAuth();
    if (!token) return;

    const url = apiUrl(API.DELETE_MSG(messageId));

    try {
      const res = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to delete message');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, status: 'deleted', message: 'This message was deleted', message_type: 'text' }
            : m
        )
      );

      toast.success('Message deleted');
    } catch (e) {
      console.error(e);
      toast.error('Network error while deleting message');
    }
  };

  // ================= NAV =================
  const openUserChats = async (user) => {
    setSelectedUser(user);
    setChats([]);
    setChatPage(1);
    chatsReset(defaultChatsFilters);
    setShowChatsFilter(false);

    setMode('chats');
    await fetchChats({ page: 1, userId: user?.id, values: defaultChatsFilters });
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    setMessages([]);
    setCursor(null);
    setHasMore(false);

    setMode('chat');
    await fetchMessagesCursor({ chatId: chat.id, nextCursor: null, appendOlder: false });
  };

  const onLoadOlder = async () => {
    if (!activeChat?.id || !cursor || msgLoading) return;
    await fetchMessagesCursor({ chatId: activeChat.id, nextCursor: cursor, appendOlder: true });
  };

  const goBack = () => {
    if (mode === 'chat') {
      setMode('chats');
      setActiveChat(null);
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      return;
    }

    if (mode === 'chats') {
      setMode('users');
      setSelectedUser(null);
      setChats([]);
      chatsReset(defaultChatsFilters);
      setShowChatsFilter(false);
    }
  };

  useEffect(() => {
    fetchUsers({ page: 1, values: defaultUsersFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerTitle = useMemo(() => {
    if (mode === 'users') return 'Chats';
    if (mode === 'chats') return selectedUser ? `Chats • ${selectedUser?.full_name}` : 'Chats';
    if (!activeChat) return 'Chat';
    const a = activeChat?.participant1?.full_name || `User #${activeChat.participant_1_id}`;
    const b = activeChat?.participant2?.full_name || `User #${activeChat.participant_2_id}`;
    return `${a} ↔ ${b}`;
  }, [mode, selectedUser, activeChat]);

  const breadcrumbLinks = useMemo(() => {
    const base = [
      { name: 'Dashboard', href: paths.dashboard.root },
      { name: 'Chat', href: paths.dashboard.chats?.root || '#' },
    ];

    if (mode === 'chats' && selectedUser) base.push({ name: `User ${selectedUser?.full_name}` });
    if (mode === 'chat' && activeChat) base.push({ name: `Chat #${activeChat?.id}` });

    return base;
  }, [mode, selectedUser, activeChat]);

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs heading={headerTitle} links={breadcrumbLinks} sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {mode !== 'users' && (
            <Button variant="contained" onClick={goBack}>
              <Iconify icon="mdi:arrow-left" sx={{ width: 20, mr: 1 }} />
              Back
            </Button>
          )}

          {mode === 'users' && (
            <Button variant="contained" onClick={() => setShowUsersFilter((p) => !p)}>
              <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
              {showUsersFilter ? 'Hide Filter' : 'Show Filter'}
            </Button>
          )}

          {mode === 'chats' && (
            <Button variant="contained" onClick={() => setShowChatsFilter((p) => !p)}>
              <Iconify icon="stash:filter" sx={{ width: 20, mr: 1 }} />
              {showChatsFilter ? 'Hide Filter' : 'Show Filter'}
            </Button>
          )}
        </Box>
      </Box>

      {/* ================= USERS MODE ================= */}
      {mode === 'users' && (
        <>
          <Collapse in={showUsersFilter} timeout="auto">
            <form onSubmit={usersHandleSubmit(applyUsersFilters)}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Controller
                    name="full_name"
                    control={usersControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Full Name"
                        placeholder="Search name…"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="email"
                    control={usersControl}
                    render={({ field }) => (
                      <TextField {...field} label="Email" placeholder="Search email…" fullWidth />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="phone"
                    control={usersControl}
                    render={({ field }) => (
                      <TextField {...field} label="Phone" placeholder="Search phone…" fullWidth />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="country"
                    control={usersControl}
                    render={({ field }) => (
                      <CountrySelector
                        label="Country"
                        placeholder="Select country…"
                        multiple={false}
                        disabled={usersLoading}
                        valueCode={field.value || ''}
                        onChangeCode={(code) => field.onChange(code)}
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Controller
                      name="type"
                      control={usersControl}
                      render={({ field }) => (
                        <Select {...field} label="Type">
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="real">Real</MenuItem>
                          <MenuItem value="bot">Bot</MenuItem>
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
                      control={usersControl}
                      render={({ field }) => (
                        <Select {...field} label="Status">
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="0">Pending</MenuItem>
                          <MenuItem value="1">Active</MenuItem>
                          <MenuItem value="2">Suspended</MenuItem>
                          <MenuItem value="3">Disabled</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Is Active</InputLabel>
                    <Controller
                      name="is_active"
                      control={usersControl}
                      render={({ field }) => (
                        <Select {...field} label="Is Active">
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="true">True</MenuItem>
                          <MenuItem value="false">False</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Controller
                      name="gender"
                      control={usersControl}
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
                    <InputLabel>Sort By</InputLabel>
                    <Controller
                      name="sortBy"
                      control={usersControl}
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
                      control={usersControl}
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
                  <Stack direction="row" spacing={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{ height: 50 }}
                      disabled={usersLoading}
                      startIcon={<Iconify icon="mdi:check" />}
                    >
                      Apply
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      fullWidth
                      sx={{ height: 50 }}
                      disabled={usersLoading}
                      onClick={resetUsersFilters}
                      startIcon={<Iconify icon="mdi:refresh" />}
                    >
                      Reset
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          </Collapse>

          <Grid item xs={12} sm={6} md={3}>
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
                  {usersPagination?.totalItems || 0}
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
          </Grid>

          <Card sx={{ overflow: 'hidden' }}>
            {usersLoading ? (
              <TableSkeleton cols={12} />
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
                      <TableCell>Country</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>Coins</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>Spent</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>Verified</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {users?.map((row) => {
                      const title = row?.full_name || `User #${row?.id}`;
                      const secondary = row?.email || row?.phone || '—';

                      return (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            transition: '0.12s ease',
                            '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.7) },
                          }}
                        >
                          <TableCell>{row.id}</TableCell>

                          <TableCell sx={{ minWidth: 260 }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar
                                alt={title}
                                onClick={() => avatarLightbox.open([getAvatarUrl(row)], 0)}
                                src={getAvatarUrl(row)}
                                sx={{ width: 40, height: 40 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Tooltip title={title} placement="top" arrow>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    noWrap
                                    sx={{ maxWidth: 220 }}
                                  >
                                    {title}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {secondary}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <TypeChip value={row?.type} />
                          </TableCell>

                          <TableCell>
                            <RegisterChip value={row?.register_type} />
                          </TableCell>

                          <TableCell sx={{ textTransform: 'capitalize' }}>
                            {row?.gender || '—'}
                          </TableCell>

                          <TableCell>
                            <CountryBadge code={row.country} sx={{ border: 'none' }} />
                          </TableCell>

                          <TableCell>{Number(row?.coins || 0)}</TableCell>
                          <TableCell>{row?.total_spent ?? '0.00'}</TableCell>

                          <TableCell>
                            <StatusChip value={row?.status} />
                          </TableCell>

                          <TableCell>
                            <YesNoChip value={row?.is_verified} yes="Verified" no="No" />
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip title="Open chats" placement="top" arrow>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openUserChats(row)}
                              >
                                <Iconify icon="solar:chat-round-dots-bold" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    <TableNoData notFound={(usersPagination?.totalItems || 0) === 0} />
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>

          <Stack direction="row" justifyContent="center" alignItems="center" sx={{ m: 2 }}>
            <Pagination
              count={usersPagination?.totalPages || 1}
              page={usersPage}
              onChange={(_, p) => {
                setUsersPage(p);
                const values = usersControl?._formValues || defaultUsersFilters;
                fetchUsers({ page: p, values });
              }}
              renderItem={(item) => <PaginationItem {...item} />}
            />
          </Stack>
        </>
      )}

      {/* ================= CHATS MODE ================= */}
      {mode === 'chats' && (
        <>
          <Collapse in={showChatsFilter} timeout="auto">
            <form onSubmit={chatsHandleSubmit(applyChatsFilters)}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Controller
                    name="chatId"
                    control={chatsControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Chat ID"
                        placeholder="Search chat id…"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Controller
                      name="status"
                      control={chatsControl}
                      render={({ field }) => (
                        <Select {...field} label="Status">
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="blocked">Blocked</MenuItem>
                          <MenuItem value="deleted">Deleted</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{ height: 50 }}
                      disabled={chatLoading}
                      startIcon={<Iconify icon="mdi:check" />}
                    >
                      Apply
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      fullWidth
                      sx={{ height: 50 }}
                      disabled={chatLoading}
                      onClick={resetChatsFilters}
                      startIcon={<Iconify icon="mdi:refresh" />}
                    >
                      Reset
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          </Collapse>

          <Grid item xs={12} sm={6} md={3}>
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
                <Typography sx={{ fontSize: 14 }}>Total Chats</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                  {chatPagination?.total || 0}
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
                <Iconify icon="solar:chat-round-dots-bold" />
              </Box>
            </Card>
          </Grid>

          <AdminChatChats
            selectedUser={selectedUser}
            chats={chats}
            loading={chatLoading}
            page={chatPage}
            pagination={chatPagination}
            chatSearch=""
            onOpenChat={openChat}
            onPageChange={(nextPage) =>
              fetchChats({
                page: nextPage,
                userId: selectedUser?.id,
                values: chatsControl?._formValues || defaultChatsFilters,
              })
            }
            getAvatarUrl={getAvatarUrl}
          />
        </>
      )}

      {/* ================= MESSAGES MODE ================= */}
      {mode === 'chat' && (
        <AdminChatMessages
          activeChat={activeChat}
          messages={messages}
          loading={msgLoading}
          hasMore={hasMore}
          onLoadOlder={onLoadOlder}
          onDeleteMessage={deleteMessage}
          getAvatarUrl={getAvatarUrl}
          buildFileCandidates={buildFileCandidates}
        />
      )}

      {mode === 'chat' && activeChat && (
        <Box sx={{ mt: 2, color: 'text.secondary' }}>
          <Typography variant="caption">
            Last activity: {formatDay(activeChat?.last_message_time || activeChat?.updated_at)} •{' '}
            {formatTime(activeChat?.last_message_time || activeChat?.updated_at)}
          </Typography>
        </Box>
      )}
      <ImageLightbox {...avatarLightbox.props} />
    </DashboardContent>
  );
}

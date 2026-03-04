/* eslint-disable consistent-return */

'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Grid,
  List,
  Stack,
  Paper,
  Button,
  Select,
  Dialog,
  Divider,
  Tooltip,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  IconButton,
  FormControl,
  DialogTitle,
  ListSubheader,
  DialogContent,
  InputAdornment,
  CircularProgress,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { getToken, safeJoin, tokenHelpText } from 'src/utils/user-helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function EditMasterPromptView({ open, onClose, onUpdated, promptId }) {
  const router = useRouter();
  const theme = useTheme();
  // ---------------- Tokens
  const USER_COLUMNS = useMemo(
    () => [
      'id',
      'full_name',
      'gender',
      'city',
      'state',
      'country',
      'address',
      'dob',
      'bio',
      'interests',
      'looking_for',
      'height',
      'education',
      'status',
    ],
    []
  );

  const TOKENS = useMemo(() => {
    const makeLabel = (col) => col.replace(/_/g, ' ');

    const botTokens = USER_COLUMNS.map((col) => ({
      key: `bot.${col}`,
      label: makeLabel(col),
      token: `{bot.${col}}`,
      group: 'Bot Data',
      icon: 'mdi:robot-outline',
    }));

    const userTokens = USER_COLUMNS.map((col) => ({
      key: `user.${col}`,
      label: makeLabel(col),
      token: `{user.${col}}`,
      group: 'User Data',
      icon: 'mdi:account-outline',
    }));

    return [...botTokens, ...userTokens];
  }, [USER_COLUMNS]);

  // ---------------- Form ----------------
  const defaultValues = useMemo(
    () => ({
      id: 0,
      name: '',
      prompt: '',
      user_type: 'all',
      user_time: 'all',
      bot_gender: 'any',
      personality_type: '',
      location_based: false,

      priority: 0,
      status: 'active',
    }),
    []
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues,
    mode: 'onBlur',
  });
  const [tokenQuery, setTokenQuery] = useState('');
  const [tokenGroup, setTokenGroup] = useState('all'); // all | bot | user

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState(null);

  // ---------------- Prompt caret insert ----------------
  const promptRef = useRef(null);

  const insertAtCursor = (insertText) => {
    const el = promptRef.current;
    const current = String(watch('prompt') || '');

    if (!el) {
      setValue('prompt', current + insertText, { shouldDirty: true });
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + insertText + current.slice(end);

    setValue('prompt', next, { shouldDirty: true });

    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + insertText.length;
        el.setSelectionRange(pos, pos);
      } catch (e) {
        /* ignore */
      }
    });
  };

  const copyToken = async (text, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Token copied!');
    } catch {
      toast.error('Copy failed');
    }
  };

  // Group tokens for the sidebar list (same as Add UI)
  const groupedTokens = useMemo(() => {
    const q = (tokenQuery || '').trim().toLowerCase();

    const byType = TOKENS.filter((t) => {
      if (tokenGroup === 'bot') return t.key.startsWith('bot.');
      if (tokenGroup === 'user') return t.key.startsWith('user.');
      return true; // all
    });

    const filtered = q
      ? byType.filter((t) => `${t.label} ${t.token} ${t.group}`.toLowerCase().includes(q))
      : byType;

    return filtered.reduce((acc, token) => {
      if (!acc[token.group]) acc[token.group] = [];
      acc[token.group].push(token);
      return acc;
    }, {});
  }, [TOKENS, tokenQuery, tokenGroup]);

  const buildInitialFromRow = useCallback(
    (r) => {
      if (!r) return defaultValues;

      return {
        id: Number(r.id || 0),
        name: String(r.name || ''),
        prompt: String(r.prompt || ''),
        user_type: r.user_type || 'all',
        user_time: r.user_time || 'all',
        bot_gender: r.bot_gender || 'any',
        personality_type: r.personality_type ?? '',
        location_based: r.location_based === true || r.location_based === 1,
        priority: Number.isFinite(Number(r.priority)) ? Number(r.priority) : 0,

        status: r.status || 'active',
      };
    },
    [defaultValues]
  );

  // ---------------- Fetch prompt by id when dialog opens ----------------
  useEffect(() => {
    if (!open) return;

    (async () => {
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

      if (!promptId) {
        toast.error('Missing prompt');
        return;
      }

      setLoading(true);
      try {
        const url = safeJoin(CONFIG.apiUrl, `/v1/admin/master-prompts/${promptId}`);
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

        setRow(res.data);
        reset(buildInitialFromRow(res.data));
        setTokenQuery('');
      } catch (err) {
        console.error('get prompt by id:', err);
        toast.error('Network/CORS error while loading prompt');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, promptId, reset, buildInitialFromRow, router]);

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setTokenQuery('');
      setRow(null);
      setTokenGroup('all');
      setLoading(false);
    }
  }, [open, reset, defaultValues]);

  // ---------------- Update submit (diff) ----------------
  const onSubmit = async (vals) => {
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

    const id = Number(vals.id || promptId || 0);
    if (!id) return toast.error('Invalid prompt id');
    if (!row) return toast.error('Prompt not loaded yet');

    const priorityMap = { most: 0, average: 1, less: 2 };

    const original = buildInitialFromRow(row);

    const currentNormalized = {
      id,
      name: String(vals.name || '').trim(),
      prompt: String(vals.prompt || '').trim(),
      user_type: vals.user_type || 'all',
      user_time: vals.user_time || 'all',
      bot_gender: vals.bot_gender || 'any',
      personality_type: String(vals.personality_type || '').trim() || null,
      location_based: vals.location_based === true || vals.location_based === 'true',
      priority: Number.isFinite(Number(vals.priority)) ? Number(vals.priority) : 0,

      status: vals.status || 'active',
    };

    if (currentNormalized.name && currentNormalized.name.length < 2)
      return toast.error('Name must be at least 2 chars');
    if (currentNormalized.prompt && currentNormalized.prompt.length < 10)
      return toast.error('Prompt must be at least 10 chars');

    const changed = { id };

    const origName = String(original.name || '').trim();
    const origPrompt = String(original.prompt || '').trim();

    if (currentNormalized.name !== origName) changed.name = currentNormalized.name;
    if (currentNormalized.prompt !== origPrompt) changed.prompt = currentNormalized.prompt;

    if ((currentNormalized.user_type || 'all') !== (original.user_type || 'all'))
      changed.user_type = currentNormalized.user_type;

    if ((currentNormalized.user_time || 'all') !== (original.user_time || 'all'))
      changed.user_time = currentNormalized.user_time;

    if ((currentNormalized.bot_gender || 'any') !== (original.bot_gender || 'any'))
      changed.bot_gender = currentNormalized.bot_gender;

    const origPers = String(original.personality_type || '').trim() || null;
    if (currentNormalized.personality_type !== origPers)
      changed.personality_type = currentNormalized.personality_type;

    const origLoc = original.location_based === true;
    if (currentNormalized.location_based !== origLoc)
      changed.location_based = currentNormalized.location_based;

    // original has bucket string; compare numeric
    const origPriority = Number.isFinite(Number(original.priority)) ? Number(original.priority) : 0;
    if (currentNormalized.priority !== origPriority) changed.priority = currentNormalized.priority;

    if ((currentNormalized.status || 'active') !== (original.status || 'active'))
      changed.status = currentNormalized.status;

    if (Object.keys(changed).length < 2) {
      toast.info('No changes to save');
      return;
    }

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/master-prompts/edit/${id}`);

    try {
      const result = await axios.post(url, changed, {
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

      toast.success(res?.msg || 'Updated');
      onUpdated?.(res?.data);
      onClose?.();
    } catch (err) {
      console.error('edit master prompt:', err);
      toast.error('Network/CORS error while updating prompt');
    }
  };

  // ---------------- Render (same layout as Add) ----------------
  return (
    <Dialog
      fullWidth
      maxWidth="xl"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          height: '90vh',
          maxHeight: 900,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      {/* --- HEADER --- */}
      <DialogTitle
        sx={{
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
        >
          <Iconify icon="material-symbols:edit-outline" width={24} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Master Prompt
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row?.id ? `ID: ${row.id}` : 'Update system logic and variables for bots.'}
            {row?.updated_at
              ? ` • Updated: ${dayjs(row.updated_at).format('DD MMM YYYY, hh:mm A')}`
              : ''}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 1 }}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || loading}
            startIcon={
              isSubmitting ? (
                <Iconify icon="eos-icons:loading" />
              ) : (
                <Iconify icon="mdi:content-save-check" />
              )
            }
            sx={{ px: 3, borderRadius: 1 }}
          >
            {isSubmitting ? 'Saving...' : 'Update'}
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* --- LEFT SIDEBAR: TOKENS TOOLBOX --- */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.neutral',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Sticky Search Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.neutral',
              zIndex: 1,
              flex: '0 0 auto',
            }}
          >
            <TextField
              value={tokenQuery}
              onChange={(e) => setTokenQuery(e.target.value)}
              placeholder="Search variables..."
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                sx: { bgcolor: 'background.paper', fontSize: 14 },
              }}
            />
            <FormControl fullWidth size="small" sx={{ mt: 1.25 }}>
              <Select
                value={tokenGroup}
                label="Token Type"
                onChange={(e) => setTokenGroup(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
              >
                <MenuItem value="all">All Tokens</MenuItem>
                <MenuItem value="bot">Bot Data</MenuItem>
                <MenuItem value="user">User Data</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Scrollable Token List */}
          <List
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: 2,
              pb: 2,
              '& .MuiListSubheader-root': { position: 'static' },
            }}
          >
            {Object.keys(groupedTokens).length === 0 && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  No matching tokens
                </Typography>
              </Box>
            )}

            {Object.entries(groupedTokens).map(([group, items]) => (
              <li key={group}>
                <ListSubheader
                  component="div"
                  disableSticky
                  sx={{
                    position: 'static',
                    bgcolor: 'transparent',
                    typography: 'overline',
                    fontWeight: 800,
                    color: 'text.secondary',
                    lineHeight: '36px',
                    mt: 1.5,
                    mb: 0.5,
                  }}
                >
                  {group}
                </ListSubheader>

                <Stack spacing={1}>
                  {items.map((t) => (
                    <Paper
                      key={t.key}
                      elevation={0}
                      sx={{
                        p: 1,
                        pl: 1.5,
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: theme.customShadows?.z1 || 2,
                        },
                      }}
                    >
                      {/* Left Side: Insert Action */}
                      <Box
                        onClick={() => insertAtCursor(t.token)}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Box sx={{ color: 'primary.main', display: 'flex' }}>
                          <Iconify icon={t.icon} width={20} />
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ fontSize: 13, fontWeight: 600 }}
                          >
                            {t.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontFamily: 'monospace', fontSize: 11 }}
                          >
                            {t.token}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right Side: Actions (Info & Copy) */}
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ height: 24, alignSelf: 'center', mx: 0.5 }}
                      />

                      <Tooltip title={tokenHelpText(t)} placement="top" arrow>
                        <Iconify
                          icon="mdi:information-outline"
                          width={18}
                          sx={{
                            color: 'text.disabled',
                            cursor: 'help',
                            '&:hover': { color: 'info.main' },
                          }}
                        />
                      </Tooltip>

                      <Tooltip title="Copy Token">
                        <IconButton
                          size="small"
                          onClick={(e) => copyToken(t.token, e)}
                          sx={{
                            p: 0.5,
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' },
                          }}
                        >
                          <Iconify icon="mdi:content-copy" width={18} />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Stack>
              </li>
            ))}
          </List>
        </Box>

        {/* --- RIGHT STAGE: FORM EDITOR --- */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ py: 6, display: 'grid', placeItems: 'center', width: '100%' }}>
              <CircularProgress />
              <Typography variant="caption" sx={{ mt: 1.5 }} color="text.secondary">
                Loading prompt...
              </Typography>
            </Box>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Scrollable Content */}
              <Box sx={{ p: 3, flex: 1 }}>
                <Grid container spacing={3}>
                  {/* Section 1: Configuration */}
                  <Grid item xs={12}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box
                        sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 1 }}
                      />
                      <Typography variant="h6" sx={{ fontSize: 16 }}>
                        General Configuration
                      </Typography>
                    </Stack>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Prompt Name"
                              fullWidth
                              placeholder="Enter prompt name..."
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel shrink>Status</InputLabel>
                              <Select {...field} label="Status">
                                <MenuItem value="active">
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: 'success.main',
                                      }}
                                    />
                                    <Typography>Active</Typography>
                                  </Stack>
                                </MenuItem>
                                <MenuItem value="inactive">
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: 'text.disabled',
                                      }}
                                    />
                                    <Typography>Inactive</Typography>
                                  </Stack>
                                </MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Controller
                          name="priority"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              label="Priority"
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                              placeholder="e.g. 0, 10, 50"
                              onChange={(e) => field.onChange(Number(e.target.value || 0))}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                  </Grid>

                  {/* Section 2: Targeting */}
                  <Grid item xs={12}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box
                        sx={{ width: 4, height: 24, bgcolor: 'secondary.main', borderRadius: 1 }}
                      />
                      <Typography variant="h6" sx={{ fontSize: 16 }}>
                        Targeting Rules
                      </Typography>
                    </Stack>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="bot_gender"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel shrink>Bot Gender</InputLabel>
                              <Select {...field} label="Bot Gender">
                                <MenuItem value="any">Any</MenuItem>
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="user_type"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel shrink>User Type</InputLabel>
                              <Select {...field} label="User Type">
                                <MenuItem value="all">All Users</MenuItem>
                                <MenuItem value="new">New Users</MenuItem>
                                <MenuItem value="existing">Existing Users</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="user_time"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel shrink>Time of Day</InputLabel>
                              <Select {...field} label="Time of Day">
                                <MenuItem value="all">Any Time</MenuItem>
                                <MenuItem value="morning">Morning</MenuItem>
                                <MenuItem value="afternoon">Afternoon</MenuItem>
                                <MenuItem value="evening">Evening</MenuItem>
                                <MenuItem value="night">Night</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Controller
                          name="location_based"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel shrink>Location Context</InputLabel>
                              <Select
                                {...field}
                                value={field.value ? '1' : '0'}
                                onChange={(e) => field.onChange(e.target.value === '1')}
                                label="Location Context"
                              >
                                <MenuItem value="0">Ignore Location</MenuItem>
                                <MenuItem value="1">Use Location</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="personality_type"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Personality Type (Optional)"
                              fullWidth
                              placeholder="Enter Personality.. e.g. Flirty, Intellectual, Friendly"
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Section 3: The Editor */}
                  <Grid item xs={12}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1.5 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{ width: 4, height: 24, bgcolor: 'warning.main', borderRadius: 1 }}
                        />
                        <Typography variant="h6" sx={{ fontSize: 16 }}>
                          System Prompt
                        </Typography>
                      </Stack>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Iconify icon="mdi:cursor-text" width={14} />
                        Click variable in sidebar to insert
                      </Typography>
                    </Stack>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 0,
                        borderRadius: 2,
                        bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                        border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.2)}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                        '&:focus-within': {
                          borderColor: 'primary.main',
                          boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.1)}`,
                        },
                      }}
                    >
                      <Controller
                        name="prompt"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            inputRef={promptRef}
                            placeholder="// Write the master prompt instructions here..."
                            multiline
                            minRows={15}
                            maxRows={25}
                            fullWidth
                            variant="standard"
                            InputProps={{
                              disableUnderline: true,
                              sx: {
                                px: 3,
                                py: 2.5,
                                fontFamily: "'Fira Code', 'Roboto Mono', monospace",
                                fontSize: '0.875rem',
                                lineHeight: 1.6,
                                color: 'text.primary',
                              },
                            }}
                          />
                        )}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </form>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

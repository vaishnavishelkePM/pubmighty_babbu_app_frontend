'use client';

import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { useTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Grid,
  Chip,
  Slide,
  Stack,
  Paper,
  Alert,
  Button,
  Select,
  Dialog,
  Avatar,
  MenuItem,
  TextField,
  IconButton,
  Typography,
  InputLabel,
  FormControl,
  DialogTitle,
  DialogActions,
  DialogContent,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';

import { safeTrim, getCookie } from 'src/utils/helper';
import {

  isProbablyUrl,
  safeJsonParse,
  normalizePrefillFilters,
  buildOpenProfileUrl,
  parseBotIdFromUrl,
  PreviewPanel,
  CtaCard,
} from 'src/utils/notification-helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import BotSelector from 'src/components/selectors/bot-selector';
import MediaSelectorDialog from 'src/components/selectors/media-selector-dialog';
import MultipleCountrySelector from 'src/components/selectors/multiple-country-selector';
import ActionSelector from 'src/components/selectors/global-notification-action-selector';
import NotificationCategorySelector from 'src/components/selectors/notification-category-selector';
import {
  MODE_OPTIONS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from 'src/components/chip/notification/notification_chip';

const MAX_TITLE = 120;
const MAX_BODY = 500;
const MAX_CTA_TITLE = 40;

export default function AddGlobalFilteredNotificationDialog({ open, onClose, onSuccess, prefill }) {
  const session_key = getCookie('session_key');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const EMPTY_FORM = useMemo(
    () => ({
      mode: 'GLOBAL',

      type: '',
      category_id: '',
      title: '',
      content: '',
      internal_bot_id: '',
      priority: 'normal',
      status: '',
      scheduled_at: '',

      image_url: '',
      icon_url: '',

      // . DB columns we want to fill
      landing_url: '',
      landing_url_type: 'none', // 'none' | 'internal' | 'external'

      // UI helpers for internal
      internal_action: '',
      external_url: '',

      // CTA UI (still object in state for easy form)
      cta1: {
        title: '',
        landing_type: 'external',
        internal_action: '',
        external_url: '',
        bot_id: '',
      },
      cta2: {
        title: '',
        landing_type: 'external',
        internal_action: '',
        external_url: '',
        bot_id: '',
      },

      data_json: '{}',

      max_users: 100000,
      filters: {
        countries_csv: '',
        last_active_days: '30',
        coin_value: '',
        coin_operator: 'gte',
      },
    }),
    []
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaFieldType, setMediaFieldType] = useState(null);

  const [filterPreview, setFilterPreview] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (!open) return;

    let next = { ...EMPTY_FORM };

    if (prefill && typeof prefill === 'object') {
      const pfFiltersObj = prefill.meta_filters_obj || prefill.filters || null;

      next = {
        ...next,
        mode: prefill.mode || 'FILTERED',

        // basics
        type: prefill.type ?? next.type,
        category_id: prefill.category_id ?? next.category_id,
        title: prefill.title ?? next.title,
        content: prefill.content ?? next.content,
        priority: prefill.priority ?? next.priority,
        status: prefill.status ?? next.status,
        scheduled_at: prefill.scheduled_at
          ? dayjs(prefill.scheduled_at).format('YYYY-MM-DDTHH:mm')
          : next.scheduled_at,

        // media
        image_url: prefill.image_url ?? next.image_url,
        icon_url: prefill.icon_url ?? next.icon_url,

        // inside next = { ... } in your prefill mapping (landing part)
        landing_url: prefill.landing_url ?? next.landing_url,
        landing_url_type: prefill.landing_url_type ?? next.landing_url_type,

        internal_action:
          prefill.landing_url_type === 'internal'
            ? String(prefill.landing_url || '').split('?')[0] || ''
            : (prefill.internal_action ?? next.internal_action),

        external_url:
          prefill.landing_url_type === 'external'
            ? prefill.landing_url || ''
            : (prefill.external_url ?? next.external_url),

        internal_bot_id:
          prefill.landing_url_type === 'internal'
            ? parseBotIdFromUrl(prefill.landing_url) ||
              (prefill.internal_bot_id ?? next.internal_bot_id)
            : (prefill.internal_bot_id ?? next.internal_bot_id),

        // CTAs (if backend returns flat columns, you can map them into UI objects)
        cta1:
          prefill.cta1_title || prefill.cta1_url || prefill.cta1_type
            ? {
                title: prefill.cta1_title || '',
                landing_type: prefill.cta1_type || 'external',
                internal_action:
                  prefill.cta1_type === 'internal'
                    ? String(prefill.cta1_url || '').split('?')[0] || ''
                    : '',
                external_url: prefill.cta1_type === 'external' ? prefill.cta1_url || '' : '',
                bot_id: prefill.cta1_type === 'internal' ? parseBotIdFromUrl(prefill.cta1_url) : '',
              }
            : next.cta1,

        cta2:
          prefill.cta2_title || prefill.cta2_url || prefill.cta2_type
            ? {
                title: prefill.cta2_title || '',
                landing_type: prefill.cta2_type || 'external',
                internal_action:
                  prefill.cta2_type === 'internal'
                    ? String(prefill.cta2_url || '').split('?')[0] || ''
                    : '',
                external_url: prefill.cta2_type === 'external' ? prefill.cta2_url || '' : '',
                bot_id: prefill.cta2_type === 'internal' ? parseBotIdFromUrl(prefill.cta2_url) : '',
              }
            : next.cta2,

        data_json: prefill.data_json ?? next.data_json,
        max_users: prefill.max_users ?? next.max_users,

        filters: {
          ...next.filters,
          ...normalizePrefillFilters(pfFiltersObj),
        },
      };
    }

    next.filters = {
      countries_csv: safeTrim(next.filters?.countries_csv),
      last_active_days: String(next.filters?.last_active_days || '30'),
      coin_value: next.filters?.coin_value ?? '',
      coin_operator: safeTrim(next.filters?.coin_operator) || 'gte',
    };

    next.landing_url_type = safeTrim(next.landing_url_type) || 'none';
    next.landing_url = safeTrim(next.landing_url);
    next.internal_action = safeTrim(next.internal_action);
    next.external_url = safeTrim(next.external_url);

    setForm(next);
    setShowPreview(true);
    setFilterPreview(null);
  }, [open, EMPTY_FORM, prefill]);

  // --- API
  const apiBase = `${CONFIG.apiUrl}/v1/admin/notifications`;
  const apiSendGlobal = `${apiBase}/send/global`;
  const apiPreviewFiltered = `${apiBase}/filter`;
  const apiSendFiltered = `${apiBase}/send/filter`;

  const axiosCfg = useMemo(
    () => ({
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session_key}`,
      },
      validateStatus: () => true,
    }),
    [session_key]
  );

  // --- Derived values / validation
  const mode = safeTrim(form.mode) || 'GLOBAL';
  const title = safeTrim(form.title);
  const body = safeTrim(form.content);

  const titleTooLong = title.length > MAX_TITLE;
  const bodyTooLong = body.length > MAX_BODY;

  const optionalUrlOk = useCallback((v) => {
    const s = safeTrim(v);
    return !s ? true : isProbablyUrl(s);
  }, []);

  const COIN_OPS = [
    { value: 'gt', label: 'Greater than (>)' },
    { value: 'gte', label: 'Greater or equal (≥)' },
    { value: 'lt', label: 'Less than (<)' },
    { value: 'lte', label: 'Less or equal (≤)' },
    { value: 'eq', label: 'Equal (=)' },
  ];
  // . landing validation based on landing_url_type
  const landingUrlType = safeTrim(form.landing_url_type) || 'none';

  const landingExternalMissing = landingUrlType === 'external' && !safeTrim(form.external_url);
  const landingExternalInvalid =
    landingUrlType === 'external' &&
    Boolean(safeTrim(form.external_url)) &&
    !isProbablyUrl(safeTrim(form.external_url));

  const landingInternalMissing = landingUrlType === 'internal' && !safeTrim(form.internal_action);

  // Scheduled
  const scheduledIso = (() => {
    const v = safeTrim(form.scheduled_at);
    if (!v) return null;

    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;

    return d.toISOString();
  })();
  const scheduledInvalid = safeTrim(form.scheduled_at) && !scheduledIso;

  const scheduledAtIsPast = useMemo(() => {
    if (!form.scheduled_at) return false;
    const dt = new Date(form.scheduled_at);
    return Number.isFinite(dt.getTime()) ? dt.getTime() < Date.now() - 60 * 1000 : false;
  }, [form.scheduled_at]);

  // Data JSON
  const dataObjBase = safeJsonParse(form.data_json, {});
  const dataObj = {
    ...dataObjBase,
    ...(landingUrlType === 'internal' && safeTrim(form.internal_action) === 'open-profile'
      ? { bot_id: Number(form.internal_bot_id) }
      : {}),
  };
  const dataJsonInvalid = useMemo(() => {
    if (!safeTrim(form.data_json)) return false;
    try {
      JSON.parse(form.data_json);
      return false;
    } catch {
      return true;
    }
  }, [form.data_json]);

  // Filters
  const countriesCsv = safeTrim(form.filters?.countries_csv);
  const lastActiveDaysNum = Number(form.filters?.last_active_days);

  const coinValueRaw = form.filters?.coin_value;
  const coinValueNum =
    coinValueRaw === '' || coinValueRaw === null || coinValueRaw === undefined
      ? null
      : Number(coinValueRaw);

  const coinValueInvalid =
    coinValueNum !== null && (!Number.isFinite(coinValueNum) || coinValueNum < 0);

  // CTA helpers (UI values)
  const cta1Title = safeTrim(form.cta1.title);
  const cta2Title = safeTrim(form.cta2.title);
  const INTERNAL_ACTION_OPEN_CHAT = 'open-chat';
  const INTERNAL_ACTION_OPEN_PROFILE = 'open-profile';
  const cta1TitleTooLong = cta1Title.length > MAX_CTA_TITLE;
  const cta2TitleTooLong = cta2Title.length > MAX_CTA_TITLE;

  const cta1NeedsTarget = Boolean(cta1Title);
  const cta2NeedsTarget = Boolean(cta2Title);
  const cta1NeedsBot =
    cta1NeedsTarget &&
    form.cta1.landing_type === 'internal' &&
    safeTrim(form.cta1.internal_action) === 'open-profile';

  const cta2NeedsBot =
    cta2NeedsTarget &&
    form.cta2.landing_type === 'internal' &&
    safeTrim(form.cta2.internal_action) === 'open-profile';

  const cta1BotMissing = cta1NeedsBot && !safeTrim(form.cta1.bot_id);
  const cta2BotMissing = cta2NeedsBot && !safeTrim(form.cta2.bot_id);
  const cta1TargetMissing =
    cta1NeedsTarget &&
    (form.cta1.landing_type === 'external'
      ? !safeTrim(form.cta1.external_url)
      : !safeTrim(form.cta1.internal_action));

  const cta2TargetMissing =
    cta2NeedsTarget &&
    (form.cta2.landing_type === 'external'
      ? !safeTrim(form.cta2.external_url)
      : !safeTrim(form.cta2.internal_action));

  const cta1UrlInvalid =
    cta1NeedsTarget &&
    form.cta1.landing_type === 'external' &&
    Boolean(safeTrim(form.cta1.external_url)) &&
    !isProbablyUrl(safeTrim(form.cta1.external_url));

  const cta2UrlInvalid =
    cta2NeedsTarget &&
    form.cta2.landing_type === 'external' &&
    Boolean(safeTrim(form.cta2.external_url)) &&
    !isProbablyUrl(safeTrim(form.cta2.external_url));

  const cta1PairInvalid = cta1TargetMissing || cta1UrlInvalid;
  const cta2PairInvalid = cta2TargetMissing || cta2UrlInvalid;

  const urlsInvalid =
    !optionalUrlOk(form.icon_url) ||
    !optionalUrlOk(form.image_url) ||
    landingExternalInvalid ||
    cta1UrlInvalid ||
    cta2UrlInvalid;

  const buildFiltersQueryParams = useCallback(() => {
    const f = form.filters || {};

    const cleanParams = (obj) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));

    const last_active_days = Number(f.last_active_days);
    const coin_value =
      f.coin_value === '' || f.coin_value === null || f.coin_value === undefined
        ? null
        : Number(f.coin_value);

    return cleanParams({
      countries: safeTrim(f.countries_csv),
      last_active_days: Number.isFinite(last_active_days) ? last_active_days : undefined,
      coin_value: coin_value === null ? null : Number.isFinite(coin_value) ? coin_value : undefined,
      coin_operator: safeTrim(f.coin_operator) || 'gte',
    });
  }, [form.filters]);

  const canSubmit =
    !isSubmitting &&
    Boolean(title) &&
    Boolean(body) &&
    !titleTooLong &&
    !bodyTooLong &&
    !urlsInvalid;

  // --- Media selector
  const handleOpenMediaSelector = (fieldType) => {
    setMediaFieldType(fieldType);
    setMediaDialogOpen(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaFieldType === 'icon') setForm((p) => ({ ...p, icon_url: url }));
    if (mediaFieldType === 'image') setForm((p) => ({ ...p, image_url: url }));
    setMediaDialogOpen(false);
    setMediaFieldType(null);
  };

  // --- Preview filtered
  const handlePreviewFiltered = async () => {
    setIsPreviewing(true);
    setFilterPreview(null);

    try {
      const params = { ...buildFiltersQueryParams(), limit: 2000, page: 1 };
      const res = await axios.get(apiPreviewFiltered, { ...axiosCfg, params });
      const result = res.data;

      if (result?.success) {
        setFilterPreview(result?.data || null);
        toast.success(result?.message || 'Preview OK');
      } else {
        toast.error(result?.message || 'Failed to preview filters');
      }
    } catch (e) {
      console.error('handlePreviewFiltered error:', e);
      toast.error('Error while previewing filters');
    } finally {
      setIsPreviewing(false);
    }
  };

  // . Convert UI landing fields into DB columns
  const buildLandingColumns = () => {
    const t = safeTrim(form.landing_url_type) || 'none';

    if (t === 'internal') {
      const action = safeTrim(form.internal_action);

      if (!action) return { landing_url_type: null, landing_url: null };

      // . open-profile -> include bot_id in landing_url
      if (action === 'open-profile') {
        const url = buildOpenProfileUrl(form.internal_bot_id);
        return {
          landing_url_type: url ? 'internal' : null,
          landing_url: url,
        };
      }

      return { landing_url_type: 'internal', landing_url: action };
    }

    if (t === 'external') {
      const url = safeTrim(form.external_url);
      return {
        landing_url_type: url ? 'external' : null,
        landing_url: url || null,
      };
    }

    return { landing_url_type: null, landing_url: null };
  };

  // . Convert CTA UI into DB columns
  const buildCtaColumns = (cta) => {
    const t = safeTrim(cta?.title);
    if (!t) return { title: null, type: null, url: null };

    const type = safeTrim(cta?.landing_type) === 'internal' ? 'internal' : 'external';

    if (type === 'internal') {
      const action = safeTrim(cta?.internal_action);
      if (!action) return { title: t, type: null, url: null };

      // . open-profile -> include bot_id in url
      if (action === 'open-profile') {
        const url = buildOpenProfileUrl(cta?.bot_id);
        return { title: t, type: url ? 'internal' : null, url };
      }

      return { title: t, type: 'internal', url: action };
    }

    const url = safeTrim(cta?.external_url);
    return { title: t, type: url ? 'external' : null, url: url || null };
  };

  // --- Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (cta1BotMissing) return toast.error('CTA 1: Bot is required for open-profile');
    if (cta2BotMissing) return toast.error('CTA 2: Bot is required for open-profile');
    if (!title) return toast.error('Title is required');
    if (titleTooLong) return toast.error(`Title must be ${MAX_TITLE} characters or less`);
    if (!body) return toast.error('Content is required');
    if (bodyTooLong) return toast.error(`Content must be ${MAX_BODY} characters or less`);

    if (mode === 'FILTERED') {
      if (!countriesCsv) return toast.error('Countries is required');
      if (!Number.isFinite(lastActiveDaysNum) || lastActiveDaysNum <= 0)
        return toast.error('Last Active Days is required');
      if (coinValueInvalid) return toast.error('Coin Value must be a number (>= 0) or empty');
    }

    if (cta1PairInvalid) return toast.error('CTA 1: provide title + valid target');
    if (cta2PairInvalid) return toast.error('CTA 2: provide title + valid target');
    if (cta1TitleTooLong) return toast.error(`CTA 1 title must be ${MAX_CTA_TITLE} chars or less`);
    if (cta2TitleTooLong) return toast.error(`CTA 2 title must be ${MAX_CTA_TITLE} chars or less`);

    if (landingUrlType === 'internal' && landingInternalMissing)
      return toast.error('Landing: internal action is required');
    if (landingUrlType === 'external' && landingExternalMissing)
      return toast.error('Landing: external URL is required');
    if (landingUrlType === 'internal' && safeTrim(form.internal_action) === 'open-profile') {
      if (!safeTrim(form.internal_bot_id)) {
        return toast.error('Please select a bot for open-profile');
      }
    }
    if (landingExternalInvalid) return toast.error('Landing URL must be absolute http/https');
    if (urlsInvalid) return toast.error('One or more URLs are invalid');
    if (dataJsonInvalid) return toast.error('Data JSON is invalid');
    if (scheduledInvalid) return toast.error('Scheduled time is invalid');

    setIsSubmitting(true);

    try {
      const landingCols = buildLandingColumns();

      const cta1Cols = buildCtaColumns(form.cta1);
      const cta2Cols = buildCtaColumns(form.cta2);

      // . SEND ONLY flat DB columns (backend unchanged)
      const common = {
        type: safeTrim(form.type),
        title,
        content: body,
        category_id: form.category_id ? Number(form.category_id) : null,

        icon_url: safeTrim(form.icon_url) || null,
        image_url: safeTrim(form.image_url) || null,

        // . columns
        landing_url: landingCols.landing_url,
        landing_url_type: landingCols.landing_url_type,

        cta1_title: cta1Cols.title,
        cta1_type: cta1Cols.type,
        cta1_url: cta1Cols.url,

        cta2_title: cta2Cols.title,
        cta2_type: cta2Cols.type,
        cta2_url: cta2Cols.url,

        priority: safeTrim(form.priority) || 'normal',
        status: safeTrim(form.status) || null,
        scheduled_at: scheduledIso,
        data: dataObj,
      };

      let res;

      if (mode === 'GLOBAL') {
        res = await axios.post(apiSendGlobal, common, axiosCfg);
      } else {
        const params = buildFiltersQueryParams();
        const payload = {
          ...common,
          max_users: Number(form.max_users) || 100000,
        };
        res = await axios.post(apiSendFiltered, payload, { ...axiosCfg, params });
      }

      const result = res?.data;

      if (result?.success) {
        toast.success(result?.message || result?.msg || 'Notification processed');
        onSuccess?.();
      } else {
        toast.error(result?.message || result?.msg || 'Failed');
      }
    } catch (err) {
      console.error('handleSubmit error:', err);
      toast.error('Error while sending notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI pieces
  const renderIconField = () => (
    <Grid item xs={12}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            label="Icon URL"
            placeholder="https://.../icon.png"
            value={form.icon_url}
            onChange={(e) => setForm((p) => ({ ...p, icon_url: e.target.value }))}
            error={!optionalUrlOk(form.icon_url)}
            helperText="(optional) Must be absolute URL."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mdi:image" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            onClick={() => handleOpenMediaSelector('icon')}
            sx={{ minWidth: 'auto', px: 2, height: 56 }}
          >
            <Iconify icon="mdi:folder-image" width={24} />
          </Button>
        </Box>

        {safeTrim(form.icon_url) && optionalUrlOk(form.icon_url) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              bgcolor: 'background.neutral',
              borderRadius: 1,
              border: (th) => `1px solid ${th.palette.divider}`,
            }}
          >
            <Avatar src={safeTrim(form.icon_url)} variant="rounded" sx={{ width: 40, height: 40 }}>
              <Iconify icon="mdi:image-broken" />
            </Avatar>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Preview
            </Typography>
            <IconButton size="small" onClick={() => setForm((p) => ({ ...p, icon_url: '' }))}>
              <Iconify icon="mdi:close" width={18} />
            </IconButton>
          </Box>
        )}
      </Stack>
    </Grid>
  );

  const renderImageField = () => (
    <Grid item xs={12}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            label="Image URL"
            placeholder="https://.../image.jpg"
            value={form.image_url}
            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            error={!optionalUrlOk(form.image_url)}
            helperText=" (optional) Must be absolute URL."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mdi:image-area" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            onClick={() => handleOpenMediaSelector('image')}
            sx={{ minWidth: 'auto', px: 2, height: 56 }}
          >
            <Iconify icon="mdi:folder-image" width={24} />
          </Button>
        </Box>

        {safeTrim(form.image_url) && optionalUrlOk(form.image_url) && (
          <Box
            sx={{
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden',
              border: (th) => `1px solid ${th.palette.divider}`,
              bgcolor: 'background.neutral',
            }}
          >
            <Box
              component="img"
              src={safeTrim(form.image_url)}
              alt="Preview"
              sx={{ width: '100%', maxHeight: 200, objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <IconButton
              size="small"
              onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <Iconify icon="mdi:close" width={18} />
            </IconButton>
          </Box>
        )}
      </Stack>
    </Grid>
  );

  // . Landing UI writes into landing_url_type + internal_action/external_url
  // near top with constants

  const renderLandingSection = () => (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
        <Iconify icon="solar:map-arrow-right-bold" width={20} />
        <Typography sx={{ fontWeight: 900 }}>Landing (Notification Click)</Typography>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="landing-type-label">Landing Type</InputLabel>
            <Select
              labelId="landing-type-label"
              value={form.landing_url_type}
              label="Landing Type"
              onChange={(e) => {
                const v = e.target.value;

                setForm((p) => ({
                  ...p,
                  landing_url_type: v,
                  internal_action: v === 'internal' ? p.internal_action : '',
                  external_url: v === 'external' ? p.external_url : '',
                  internal_bot_id: v === 'internal' ? p.internal_bot_id : '',
                }));
              }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="internal">Internal (App Action)</MenuItem>
              <MenuItem value="external">External (Website URL)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {form.landing_url_type === 'internal' ? (
          <>
            <Grid item xs={12} md={8}>
              <ActionSelector
                label="Internal Action"
                placeholder="Select action..."
                value={form.internal_action || ''}
                onChange={(val) => {
                  const next = val || '';
                  setForm((p) => ({
                    ...p,
                    internal_action: next,
                    // reset bot id when switching away
                    internal_bot_id: next === INTERNAL_ACTION_OPEN_PROFILE ? p.internal_bot_id : '',
                  }));
                }}
                fullWidth
              />

              {landingInternalMissing && (
                <Box sx={{ mt: 0.75 }}>
                  <Typography variant="caption" color="error">
                    Required for internal landing type
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* inline conditional block like your first dialog */}
            {safeTrim(form.internal_action) === INTERNAL_ACTION_OPEN_PROFILE && (
              <Grid item xs={12}>
                <BotSelector
                  label="Select Bot *"
                  placeholder="Search bot..."
                  valueId={form.internal_bot_id ? Number(form.internal_bot_id) : undefined}
                  onBotSelect={(id) => {
                    setForm((p) => ({ ...p, internal_bot_id: id ? String(id) : '' }));
                  }}
                  fullWidth
                />

                {!safeTrim(form.internal_bot_id) && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    Bot is required for <b>open-profile</b>.
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.75, display: 'block' }}
                >
                  Will save: <code>open-profile?bot_id=XYZ</code>
                </Typography>
              </Grid>
            )}

            {safeTrim(form.internal_action) === INTERNAL_ACTION_OPEN_CHAT && (
              <Grid item xs={12}>
                <Alert severity="info" variant="soft">
                  For <b>GLOBAL/FILTERED</b> notifications, you should not target a specific
                  chat_id. Keep <b>open-chat</b> and let the app open the chat list/home.
                </Alert>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.75, display: 'block' }}
                >
                  Will save: <code>open-chat</code>
                </Typography>
              </Grid>
            )}
          </>
        ) : form.landing_url_type === 'external' ? (
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              required
              label="External URL"
              placeholder="https://example.com"
              value={form.external_url}
              onChange={(e) => setForm((p) => ({ ...p, external_url: e.target.value }))}
              error={landingExternalMissing || landingExternalInvalid}
              helperText={
                landingExternalMissing
                  ? 'External URL is required'
                  : landingExternalInvalid
                    ? 'Must be absolute http/https URL'
                    : 'Opens when user clicks the notification'
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="mdi:link" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        ) : (
          <Grid item xs={12} md={8}>
            <Alert severity="info" variant="soft">
              Notification click won&apos;t navigate anywhere.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const previewContent = (
    <PreviewPanel
      form={form}
      title={title}
      body={body}
      cta1Title={safeTrim(form.cta1.title)}
      cta1Url={
        form.cta1.landing_type === 'external'
          ? safeTrim(form.cta1.external_url)
          : `internal:${safeTrim(form.cta1.internal_action)}`
      }
      cta2Title={safeTrim(form.cta2.title)}
      cta2Url={
        form.cta2.landing_type === 'external'
          ? safeTrim(form.cta2.external_url)
          : `internal:${safeTrim(form.cta2.internal_action)}`
      }
    />
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth={!isMobile}
      maxWidth="lg"
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
      PaperProps={{
        sx: (th) => ({
          borderRadius: { xs: 0, md: 3 },
          overflow: 'hidden',
          boxShadow: th.shadows[24],
          border: `1px solid ${th.palette.divider}`,
          bgcolor: 'background.paper',
          height: { xs: '100vh', sm: '95vh' },
          m: { xs: 0, sm: 2 },
        }),
      }}
    >
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 10,
          borderBottom: (th) => `1px solid ${th.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
          <Box
            sx={{
              width: { xs: 32, sm: 40 },
              height: { xs: 32, sm: 40 },
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.lighter',
              color: 'primary.main',
            }}
          >
            <Iconify icon="mdi:bell-ring-outline" width={{ xs: 20, sm: 24 }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: { xs: 14, sm: 18 }, fontWeight: 800, lineHeight: 1.1 }}>
              Global/Filtered Notifications
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: 11, sm: 13 },
                fontFamily: 'monospace',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Content, targeting & delivery
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ ml: { xs: 1, sm: 2 }, display: { xs: 'none', md: 'flex' } }}
            alignItems="center"
          >
            <Chip size="small" label={MODE_OPTIONS.find((m) => m.value === mode)?.label || mode} />
            <Chip
              size="small"
              label={
                PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label || form.priority
              }
            />
            <Chip size="small" label={`${title.length}/${MAX_TITLE}`} />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant={showPreview ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setShowPreview((v) => !v)}
            startIcon={
              <Iconify icon={showPreview ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={18} />
            }
            sx={{ minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1, sm: 2 } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {showPreview ? 'Hide' : 'Show'} Preview
            </Box>
          </Button>

          <IconButton onClick={onClose} size="small">
            <Iconify icon="mdi:close" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.neutral', overflowY: 'auto' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={showPreview ? 7 : 12}>
            <Stack spacing={2.5}>
              {/* Basics */}
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:widget-bold" width={20} />
                  <Typography sx={{ fontWeight: 900 }}>Basics</Typography>
                </Stack>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Mode *</InputLabel>
                      <Select
                        value={form.mode}
                        label="Mode *"
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((p) => ({ ...p, mode: v }));
                          setFilterPreview(null);
                        }}
                      >
                        {MODE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <NotificationCategorySelector
                      label="Category *"
                      placeholder="Search category type"
                      statusFilter="active"
                      valueId={form.category_id ? Number(form.category_id) : undefined}
                      onCategorySelect={(id, category) => {
                        setForm((p) => ({
                          ...p,
                          category_id: id ? String(id) : '',
                          type: category?.type ? String(category.type) : '',
                        }));
                      }}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={form.priority}
                        label="Priority"
                        onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={form.status}
                        label="Status"
                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DateTimePicker
                        label="Schedule Send Time"
                        value={form.scheduled_at ? dayjs(form.scheduled_at) : null}
                        onChange={(newValue) => {
                          setForm((p) => ({
                            ...p,
                            scheduled_at: newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '',
                          }));
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: scheduledInvalid,
                            helperText: form.scheduled_at
                              ? scheduledAtIsPast
                                ? 'Past time: may queue immediately.'
                                : 'Future time: will schedule.'
                              : 'Leave empty to send immediately.',
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Iconify icon="mdi:calendar-clock" />
                                </InputAdornment>
                              ),
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
              </Paper>

              {/* Filters */}
              {mode === 'FILTERED' && (
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                    <Iconify icon="solar:filter-bold" width={20} />
                    <Typography sx={{ fontWeight: 900 }}>Filters</Typography>
                  </Stack>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <MultipleCountrySelector
                        label="Countries *"
                        placeholder="Select countries..."
                        multiple
                        valueCSV={form.filters.countries_csv}
                        onCountriesSelect={(_, csv) =>
                          setForm((p) => ({
                            ...p,
                            filters: { ...p.filters, countries_csv: csv },
                          }))
                        }
                        maxSelections={300}
                        fullWidth
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Last Active Days *"
                        value={form.filters.last_active_days}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            filters: { ...p.filters, last_active_days: e.target.value },
                          }))
                        }
                        error={
                          mode === 'FILTERED' &&
                          (!Number.isFinite(lastActiveDaysNum) || lastActiveDaysNum <= 0)
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify icon="mdi:clock-outline" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Coin Operator</InputLabel>
                        <Select
                          value={form.filters.coin_operator || 'gte'}
                          label="Coin Operator"
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              filters: { ...p.filters, coin_operator: e.target.value },
                            }))
                          }
                        >
                          {COIN_OPS.map((x) => (
                            <MenuItem key={x.value} value={x.value}>
                              {x.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Coin Value (optional)"
                        value={form.filters.coin_value}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            filters: { ...p.filters, coin_value: e.target.value },
                          }))
                        }
                        error={coinValueInvalid}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify icon="mdi:coin" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          variant="outlined"
                          onClick={handlePreviewFiltered}
                          disabled={isPreviewing}
                          startIcon={<Iconify icon={isPreviewing ? 'mdi:loading' : 'mdi:eye'} />}
                        >
                          {isPreviewing ? 'Previewing...' : 'Preview'}
                        </Button>

                        <Button
                          variant="text"
                          color="inherit"
                          onClick={() => {
                            setFilterPreview(null);
                            setForm((p) => ({
                              ...p,
                              filters: EMPTY_FORM.filters,
                              max_users: EMPTY_FORM.max_users,
                            }));
                          }}
                        >
                          Reset Filters
                        </Button>
                      </Stack>
                    </Grid>

                    {filterPreview && (
                      <Grid item xs={12}>
                        <Alert severity="success" variant="soft">
                          Matched Users: <b>{filterPreview?.matched_users ?? '-'}</b>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Notification Content */}
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:bell-bold" width={20} />
                  <Typography sx={{ fontWeight: 900 }}>Notification Content</Typography>
                </Stack>

                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Title *"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      error={titleTooLong}
                      helperText={`${title.length}/${MAX_TITLE}${titleTooLong ? ' — too long' : ''}`}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="mdi:format-title" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      multiline
                      rows={3}
                      label="Content *"
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                      error={bodyTooLong}
                      helperText={`${body.length}/${MAX_BODY}${bodyTooLong ? ' — too long' : ''}`}
                    />
                  </Grid>

                  {renderIconField()}
                  {renderImageField()}
                </Grid>
              </Paper>

              {/* . Landing */}
              {renderLandingSection()}

              {/* Actions (CTAs) */}
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:cursor-square-bold" width={20} />
                  <Typography sx={{ fontWeight: 900 }}>Actions (CTAs)</Typography>
                </Stack>

                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <CtaCard
                      label="CTA 1"
                      color="primary"
                      cta={form.cta1}
                      setCta={(updater) =>
                        setForm((p) => ({
                          ...p,
                          cta1: typeof updater === 'function' ? updater(p.cta1) : updater,
                        }))
                      }
                      titleValue={safeTrim(form.cta1.title)}
                      urlValue={
                        form.cta1.landing_type === 'external'
                          ? safeTrim(form.cta1.external_url)
                          : ''
                      }
                      urlInvalid={cta1UrlInvalid}
                      pairInvalid={cta1PairInvalid}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <CtaCard
                      label="CTA 2"
                      color="secondary"
                      cta={form.cta2}
                      setCta={(updater) =>
                        setForm((p) => ({
                          ...p,
                          cta2: typeof updater === 'function' ? updater(p.cta2) : updater,
                        }))
                      }
                      titleValue={safeTrim(form.cta2.title)}
                      urlValue={
                        form.cta2.landing_type === 'external'
                          ? safeTrim(form.cta2.external_url)
                          : ''
                      }
                      urlInvalid={cta2UrlInvalid}
                      pairInvalid={cta2PairInvalid}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          </Grid>

          {showPreview && (
            <Grid item xs={12} lg={5}>
              <Box sx={{ position: 'sticky', top: 16 }}>{previewContent}</Box>
            </Grid>
          )}
        </Grid>

        <MediaSelectorDialog
          open={mediaDialogOpen}
          onClose={() => {
            setMediaDialogOpen(false);
            setMediaFieldType(null);
          }}
          onSelect={handleMediaSelect}
          selectedUrl={
            mediaFieldType === 'icon'
              ? form.icon_url
              : mediaFieldType === 'image'
                ? form.image_url
                : ''
          }
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: (th) => `1px solid ${th.palette.divider}`,
          gap: 1,
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Button
          color="inherit"
          variant="outlined"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={isSubmitting ? <Iconify icon="mdi:loading" /> : <Iconify icon="mdi:send" />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {isSubmitting ? 'Sending...' : 'Send Notification'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

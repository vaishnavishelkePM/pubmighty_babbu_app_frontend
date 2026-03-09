/* eslint-disable consistent-return */

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
  Fade,
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
  buildInternalUrl,
  DATA_KEYS,
  PreviewPanel,
} from 'src/utils/notification-helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import UserSelector from 'src/components/selectors/user-selector';
import ChatSelectorByUser from 'src/components/selectors/chat-selector';
import MediaSelectorDialog from 'src/components/selectors/media-selector-dialog';
import ActionSelector from 'src/components/selectors/single-notification-action-selector';
import NotificationCategorySelector from 'src/components/selectors/notification-category-selector';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from 'src/components/chip/notification/notification_chip';

const MAX_TITLE = 150;
const MAX_BODY = 500;
const MAX_CTA_TITLE = 40;

const INTERNAL_ACTION_OPEN_CHAT = 'open-chat';
const INTERNAL_ACTION_OPEN_PROFILE = 'open-profile';

export default function AddSingleNotificationDialog({ open, onClose, onSuccess }) {
  const session_key = getCookie('session_key');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const EMPTY_FORM = useMemo(
    () => ({
      receiverId: '',
      category_id: '',
      type: '',
      title: '',
      content: '',

      priority: 'normal',
      status: '',
      scheduled_at: '',

      image_url: '',
      icon_url: '',

      // Landing
      landing_type: 'none', // none | internal | external
      landing_internal_action: '',
      landing_external_url: '',
      landing_chat_user_id: '',
      landing_chat_id: '',

      // CTA1
      cta1_title: '',
      cta1_landing_type: 'external',
      cta1_internal_action: '',
      cta1_external_url: '',
      cta1_chat_user_id: '',
      cta1_chat_id: '',

      // CTA2
      cta2_title: '',
      cta2_landing_type: 'external',
      cta2_internal_action: '',
      cta2_external_url: '',
      cta2_chat_user_id: '',
      cta2_chat_id: '',

      data_json: '{}',
    }),
    []
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaFieldType, setMediaFieldType] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setShowPreview(true);
  }, [open, EMPTY_FORM]);

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

  const title = safeTrim(form.title);
  const body = safeTrim(form.content);

  const titleTooLong = title.length > MAX_TITLE;
  const bodyTooLong = body.length > MAX_BODY;

  const receiverIdNum = Number(form.receiverId);
  const receiverInvalid = !Number.isFinite(receiverIdNum) || receiverIdNum <= 0;
  const receiverReady = !receiverInvalid;

  const scheduledIso = (() => {
    const v = safeTrim(form.scheduled_at);
    if (!v) return null;

    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;

    return d.toISOString();
  })();
  const scheduledInvalid = Boolean(safeTrim(form.scheduled_at)) && !scheduledIso;

  const scheduledAtIsPast = useMemo(() => {
    if (!form.scheduled_at) return false;
    const dt = new Date(form.scheduled_at);
    return Number.isFinite(dt.getTime()) ? dt.getTime() < Date.now() - 60 * 1000 : false;
  }, [form.scheduled_at]);

  const dataObj = safeJsonParse(form.data_json, {});
  const dataJsonInvalid = (() => {
    if (!safeTrim(form.data_json)) return false;
    try {
      JSON.parse(form.data_json);
      return false;
    } catch {
      return true;
    }
  })();

  const patchDataJson = useCallback((patch) => {
    setForm((p) => {
      const current = safeJsonParse(p.data_json, {});
      const next = { ...(current || {}), ...(patch || {}) };
      return { ...p, data_json: JSON.stringify(next, null, 2) };
    });
  }, []);

  // reset chat fields on receiver change
  useEffect(() => {
    setForm((p) => ({
      ...p,
      landing_chat_user_id: '',
      landing_chat_id: '',
      cta1_chat_user_id: '',
      cta1_chat_id: '',
      cta2_chat_user_id: '',
      cta2_chat_id: '',
    }));

    patchDataJson({
      [DATA_KEYS.landing.userId]: null,
      [DATA_KEYS.landing.chatId]: null,
      [DATA_KEYS.cta1.userId]: null,
      [DATA_KEYS.cta1.chatId]: null,
      [DATA_KEYS.cta2.userId]: null,
      [DATA_KEYS.cta2.chatId]: null,
    });
  }, [form.receiverId, patchDataJson]);

  // ---------- URL validations ----------
  const iconUrlInvalid =
    Boolean(safeTrim(form.icon_url)) && !isProbablyUrl(safeTrim(form.icon_url));
  const imageUrlInvalid =
    Boolean(safeTrim(form.image_url)) && !isProbablyUrl(safeTrim(form.image_url));

  const landingExternalMissing =
    form.landing_type === 'external' && !safeTrim(form.landing_external_url);
  const landingExternalInvalid =
    form.landing_type === 'external' &&
    Boolean(safeTrim(form.landing_external_url)) &&
    !isProbablyUrl(safeTrim(form.landing_external_url));

  const landingInternalMissing =
    form.landing_type === 'internal' && !safeTrim(form.landing_internal_action);

  const landingAction = safeTrim(form.landing_internal_action);

  const landingNeedsChatId =
    form.landing_type === 'internal' && landingAction === INTERNAL_ACTION_OPEN_CHAT;

  const landingNeedsUserId =
    form.landing_type === 'internal' && landingAction === INTERNAL_ACTION_OPEN_PROFILE;

  const landingChatMissing = landingNeedsChatId && !Number(form.landing_chat_id);
  const landingUserMissing = landingNeedsUserId && !Number(form.landing_chat_user_id);

  const cta1Title = safeTrim(form.cta1_title);
  const cta2Title = safeTrim(form.cta2_title);

  const cta1TitleTooLong = cta1Title.length > MAX_CTA_TITLE;
  const cta2TitleTooLong = cta2Title.length > MAX_CTA_TITLE;

  const cta1NeedsTarget = Boolean(cta1Title);
  const cta2NeedsTarget = Boolean(cta2Title);

  const cta1TargetMissing =
    cta1NeedsTarget &&
    (form.cta1_landing_type === 'external'
      ? !safeTrim(form.cta1_external_url)
      : !safeTrim(form.cta1_internal_action));

  const cta2TargetMissing =
    cta2NeedsTarget &&
    (form.cta2_landing_type === 'external'
      ? !safeTrim(form.cta2_external_url)
      : !safeTrim(form.cta2_internal_action));

  const cta1UrlInvalid =
    cta1NeedsTarget &&
    form.cta1_landing_type === 'external' &&
    Boolean(safeTrim(form.cta1_external_url)) &&
    !isProbablyUrl(safeTrim(form.cta1_external_url));

  const cta2UrlInvalid =
    cta2NeedsTarget &&
    form.cta2_landing_type === 'external' &&
    Boolean(safeTrim(form.cta2_external_url)) &&
    !isProbablyUrl(safeTrim(form.cta2_external_url));

  const urlsInvalid =
    iconUrlInvalid || imageUrlInvalid || landingExternalInvalid || cta1UrlInvalid || cta2UrlInvalid;

  const canSubmit =
    !isSubmitting &&
    Boolean(title) &&
    Boolean(body) &&
    !titleTooLong &&
    !bodyTooLong &&
    receiverReady &&
    Boolean(form.category_id) &&
    !urlsInvalid &&
    !dataJsonInvalid &&
    !scheduledInvalid &&
    !landingExternalMissing &&
    !landingInternalMissing &&
    !cta1TitleTooLong &&
    !cta2TitleTooLong &&
    !cta1TargetMissing &&
    !cta2TargetMissing &&
    !landingChatMissing &&
    !landingUserMissing;

  const apiBase = `${CONFIG.apiUrl}/v1/admin/notifications`;
  const apiSendUser = `${apiBase}/send/user`;

  const axiosCfg = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session_key}`,
    },
    validateStatus: () => true,
  };

  const buildCtaObject = (idx) => {
    const isOne = idx === 1;

    const titleLocal = safeTrim(isOne ? form.cta1_title : form.cta2_title);
    if (!titleLocal) return null;

    const typeLocal = safeTrim(isOne ? form.cta1_landing_type : form.cta2_landing_type);
    let urlLocal = '';

    if (typeLocal === 'external') {
      urlLocal = safeTrim(isOne ? form.cta1_external_url : form.cta2_external_url);
    } else {
      const action = safeTrim(isOne ? form.cta1_internal_action : form.cta2_internal_action);
      const chatId = isOne ? form.cta1_chat_id : form.cta2_chat_id;
      const botId = isOne ? form.cta1_chat_user_id : form.cta2_chat_user_id;

      urlLocal =
        action === INTERNAL_ACTION_OPEN_CHAT
          ? buildInternalUrl(action, { chatId })
          : action === INTERNAL_ACTION_OPEN_PROFILE
            ? buildInternalUrl(action, { botId })
            : buildInternalUrl(action);
    }

    return {
      title: titleLocal,
      type: typeLocal === 'internal' ? 'internal' : 'external',
      url: urlLocal,
    };
  };

  const buildPayload = () => {
    const payload = {
      receiverId: receiverIdNum,
      category_id: Number(form.category_id),
      title,
      content: body,
      priority: safeTrim(form.priority) || 'normal',
    };

    if (safeTrim(form.status)) payload.status = safeTrim(form.status);
    if (scheduledIso) payload.scheduled_at = scheduledIso;

    if (safeTrim(form.image_url)) payload.image_url = safeTrim(form.image_url);
    if (safeTrim(form.icon_url)) payload.icon_url = safeTrim(form.icon_url);

    if (form.landing_type === 'external') {
      payload.landing_url = safeTrim(form.landing_external_url);
      payload.landing_url_type = 'external';
    } else if (form.landing_type === 'internal') {
      const action = safeTrim(form.landing_internal_action);

      payload.landing_url =
        action === INTERNAL_ACTION_OPEN_CHAT
          ? buildInternalUrl(action, { chatId: form.landing_chat_id })
          : action === INTERNAL_ACTION_OPEN_PROFILE
            ? buildInternalUrl(action, { botId: form.landing_chat_user_id })
            : buildInternalUrl(action);

      payload.landing_url_type = 'internal';
    } else {
      payload.landing_url = null;
      payload.landing_url_type = null;
    }

    payload.cta1 = buildCtaObject(1);
    payload.cta2 = buildCtaObject(2);

    if (safeTrim(form.data_json) && !dataJsonInvalid) payload.data = dataObj;

    return payload;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!title) return toast.error('Title is required');
    if (titleTooLong) return toast.error(`Title must be ${MAX_TITLE} characters or less`);
    if (!body) return toast.error('Content is required');
    if (bodyTooLong) return toast.error(`Content must be ${MAX_BODY} characters or less`);
    if (!receiverReady) return toast.error('Valid receiver user is required');
    if (!form.category_id) return toast.error('Category is required');

    if (form.landing_type === 'internal' && landingInternalMissing) {
      return toast.error('Landing internal action is required');
    }
    if (form.landing_type === 'external' && landingExternalMissing) {
      return toast.error('Landing external URL is required');
    }
    if (landingExternalInvalid) return toast.error('Landing external URL is invalid');

    // . FIX: block when internal open-chat but no chat
    if (landingNeedsChatId && landingChatMissing) return toast.error('Please select a chat');
    // . FIX: block when internal open-profile but no user
    if (landingNeedsUserId && landingUserMissing)
      return toast.error('Please select a profile user');

    if (cta1TitleTooLong) return toast.error('CTA1 title must be 40 chars or less');
    if (cta2TitleTooLong) return toast.error('CTA2 title must be 40 chars or less');
    if (cta1TargetMissing)
      return toast.error('CTA1 target is required when CTA1 title is provided');
    if (cta2TargetMissing)
      return toast.error('CTA2 target is required when CTA2 title is provided');

    if (urlsInvalid)
      return toast.error('One or more URLs are invalid (must be absolute http/https)');
    if (dataJsonInvalid) return toast.error('Data JSON is invalid');
    if (scheduledInvalid) return toast.error('Scheduled time is invalid');

    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      const res = await axios.post(apiSendUser, payload, axiosCfg);
      const result = res?.data;

      if (result?.success) {
        toast.success(result?.message || 'Notification processed');
        onSuccess?.();
      } else {
        toast.error(result?.message || 'Failed');
      }
    } catch (err) {
      console.error('handleSubmit error:', err);
      toast.error('Error while sending notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- UI helpers ----------
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
            error={Boolean(safeTrim(form.icon_url)) && !isProbablyUrl(safeTrim(form.icon_url))}
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

        {form.icon_url && isProbablyUrl(safeTrim(form.icon_url)) && (
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
            <Avatar src={form.icon_url} variant="rounded" sx={{ width: 40, height: 40 }}>
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
            error={Boolean(safeTrim(form.image_url)) && !isProbablyUrl(safeTrim(form.image_url))}
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

        {form.image_url && isProbablyUrl(safeTrim(form.image_url)) && (
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
              src={form.image_url}
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

  // . FIX: Landing section now contains the extra selectors INSIDE it
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
              value={form.landing_type}
              label="Landing Type"
              onChange={(e) => {
                const v = e.target.value;

                setForm((p) => ({
                  ...p,
                  landing_type: v,
                  landing_internal_action: v === 'internal' ? p.landing_internal_action : '',
                  landing_external_url: v === 'external' ? p.landing_external_url : '',
                  landing_chat_user_id: v === 'internal' ? p.landing_chat_user_id : '',
                  landing_chat_id: v === 'internal' ? p.landing_chat_id : '',
                }));

                if (v !== 'internal') {
                  patchDataJson({
                    [DATA_KEYS.landing.userId]: null,
                    [DATA_KEYS.landing.chatId]: null,
                  });
                }
              }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="internal">Internal (App Action)</MenuItem>
              <MenuItem value="external">External (Website URL)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {form.landing_type === 'internal' ? (
          <>
            <Grid item xs={12} md={8}>
              <ActionSelector
                label="Internal Action"
                value={form.landing_internal_action || ''}
                fullWidth
                disabled={false}
                onChange={(newVal) => {
                  const nextAction = newVal || '';

                  // . FIX: reset ids when switching actions
                  setForm((p) => ({
                    ...p,
                    landing_internal_action: nextAction,
                    landing_chat_user_id: '',
                    landing_chat_id: '',
                  }));

                  patchDataJson({
                    [DATA_KEYS.landing.userId]: null,
                    [DATA_KEYS.landing.chatId]: null,
                  });
                }}
              />

              {landingInternalMissing && (
                <Box sx={{ mt: 0.75 }}>
                  <Typography variant="caption" color="error">
                    Required for internal landing type
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* . FIX: show chat selector ONLY when action=open-chat */}
            {/* {safeTrim(form.landing_internal_action) === INTERNAL_ACTION_OPEN_CHAT && (
              <Grid item xs={12}>
                <ChatSelectorByUser
                  key={`landing-chat-for-${receiverReady ? receiverIdNum : 'none'}`}
                  // . FIX: IMPORTANT — use the prop your component actually expects:
                  userId={receiverReady ? receiverIdNum : undefined}
                  disabled={!receiverReady}
                  label="Select Chat * (who this user talked with)"
                  placeholder={
                    receiverReady ? 'Search by chat / other user…' : 'Select receiver user first'
                  }
                  onSelect={(payload) => {
                    if (!payload) {
                      setForm((p) => ({
                        ...p,
                        landing_chat_user_id: '',
                        landing_chat_id: '',
                      }));
                      patchDataJson({
                        [DATA_KEYS.landing.userId]: null,
                        [DATA_KEYS.landing.chatId]: null,
                      });
                      return;
                    }

                    setForm((p) => ({
                      ...p,
                      landing_chat_user_id: String(payload.user_id || ''),
                      landing_chat_id: String(payload.chat_id || ''),
                    }));

                    patchDataJson({
                      [DATA_KEYS.landing.userId]: payload.user_id,
                      [DATA_KEYS.landing.chatId]: payload.chat_id,
                    });
                  }}
                  fullWidth
                />

                {landingChatMissing && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    Chat is required for <b>open-chat</b>.
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.75, display: 'block' }}
                >
                  Will save: <code>open-chat?chat-id=XYZ</code>
                </Typography>
              </Grid>
            )} */}

            {safeTrim(form.landing_internal_action) === INTERNAL_ACTION_OPEN_CHAT && (
              <Grid item xs={12}>
                <ChatSelectorByUser
                  key={`landing-chat-for-${receiverReady ? receiverIdNum : 'none'}`}
                  userId={receiverReady ? receiverIdNum : undefined}
                  disabled={!receiverReady}
                  label="Select Chat * (who this user talked with)"
                  placeholder={
                    receiverReady ? 'Search user from chats…' : 'Select receiver user first'
                  }
                  onChatSelect={(chatId, otherUserId) => {
                    // clear
                    if (!chatId) {
                      setForm((p) => ({
                        ...p,
                        landing_chat_user_id: '',
                        landing_chat_id: '',
                      }));
                      patchDataJson({
                        [DATA_KEYS.landing.userId]: null,
                        [DATA_KEYS.landing.chatId]: null,
                      });
                      return;
                    }

                    setForm((p) => ({
                      ...p,
                      landing_chat_id: String(chatId),
                      // store the other user id too (optional but useful)
                      landing_chat_user_id: otherUserId ? String(otherUserId) : '',
                    }));

                    patchDataJson({
                      [DATA_KEYS.landing.chatId]: Number(chatId),
                      [DATA_KEYS.landing.userId]: otherUserId ? Number(otherUserId) : null,
                    });
                  }}
                  fullWidth
                />

                {landingChatMissing && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    Chat is required for <b>open-chat</b>.
                  </Typography>
                )}
              </Grid>
            )}

            {/* . FIX: show user selector ONLY when action=open-profile */}
            {safeTrim(form.landing_internal_action) === INTERNAL_ACTION_OPEN_PROFILE && (
              <Grid item xs={12}>
                <ChatSelectorByUser
                  key={`landing-profile-from-chats-${receiverReady ? receiverIdNum : 'none'}`}
                  userId={receiverReady ? receiverIdNum : undefined}
                  disabled={!receiverReady}
                  label="Select user from chats * (profile will open for this user)"
                  placeholder={
                    receiverReady ? 'Search user from chats…' : 'Select receiver user first'
                  }
                  onChatSelect={(chatId, otherUserId) => {
                    if (!otherUserId) {
                      setForm((p) => ({
                        ...p,
                        landing_chat_user_id: '',
                        landing_chat_id: '',
                      }));
                      patchDataJson({
                        [DATA_KEYS.landing.userId]: null,
                        [DATA_KEYS.landing.chatId]: null,
                      });
                      return;
                    }

                    // . bot-id should be the "other user id"
                    setForm((p) => ({
                      ...p,
                      landing_chat_user_id: String(otherUserId),
                      landing_chat_id: chatId ? String(chatId) : '',
                    }));

                    patchDataJson({
                      [DATA_KEYS.landing.userId]: Number(otherUserId),
                      [DATA_KEYS.landing.chatId]: chatId ? Number(chatId) : null,
                    });
                  }}
                  fullWidth
                />

                {landingUserMissing && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    User is required for <b>open-profile</b>.
                  </Typography>
                )}
              </Grid>
            )}
          </>
        ) : form.landing_type === 'external' ? (
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              required
              label="External URL"
              placeholder="https://example.com"
              value={form.landing_external_url}
              onChange={(e) => setForm((p) => ({ ...p, landing_external_url: e.target.value }))}
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
            <Alert variant="soft" severity="info">
              No landing action will be attached to this notification.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const renderCtaBlock = (idx) => {
    const isOne = idx === 1;

    const titleKey = isOne ? 'cta1_title' : 'cta2_title';
    const landingTypeKey = isOne ? 'cta1_landing_type' : 'cta2_landing_type';
    const internalKey = isOne ? 'cta1_internal_action' : 'cta2_internal_action';
    const externalKey = isOne ? 'cta1_external_url' : 'cta2_external_url';
    const chatUserIdKey = isOne ? 'cta1_chat_user_id' : 'cta2_chat_user_id';
    const chatIdKey = isOne ? 'cta1_chat_id' : 'cta2_chat_id';

    const dataKeys = isOne ? DATA_KEYS.cta1 : DATA_KEYS.cta2;

    const ctaTitleLocal = safeTrim(form[titleKey] || '');
    const landingType = form[landingTypeKey] || 'external';
    const internalAction = safeTrim(form[internalKey] || '');
    const externalUrl = safeTrim(form[externalKey] || '');

    const titleTooLongLocal = ctaTitleLocal.length > MAX_CTA_TITLE;
    const needsTarget = Boolean(ctaTitleLocal);

    const targetMissingLocal =
      needsTarget && (landingType === 'external' ? !externalUrl : !internalAction);

    const urlInvalidLocal =
      needsTarget &&
      landingType === 'external' &&
      Boolean(externalUrl) &&
      !isProbablyUrl(externalUrl);

    return (
      <Grid item xs={12}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: 'background.neutral',
            border: (th) =>
              targetMissingLocal || urlInvalidLocal || titleTooLongLocal
                ? `2px solid ${th.palette.error.main}`
                : `1px solid ${th.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip
              label={`CTA ${idx}`}
              size="small"
              color={isOne ? 'primary' : 'secondary'}
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" color="text.secondary">
              {isOne ? 'Primary action button' : 'Secondary action button'}
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Button Title"
                value={form[titleKey]}
                onChange={(e) => setForm((p) => ({ ...p, [titleKey]: e.target.value }))}
                error={titleTooLongLocal}
                helperText={`${ctaTitleLocal.length}/${MAX_CTA_TITLE}`}
                inputProps={{ maxLength: MAX_CTA_TITLE }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id={`${idx}-cta-landing-type`}>Landing Type</InputLabel>
                <Select
                  labelId={`${idx}-cta-landing-type`}
                  value={landingType}
                  label="Landing Type"
                  onChange={(e) => {
                    const v = e.target.value;

                    setForm((p) => ({
                      ...p,
                      [landingTypeKey]: v,
                      [internalKey]: v === 'internal' ? p[internalKey] : '',
                      [externalKey]: v === 'external' ? p[externalKey] : '',
                      [chatUserIdKey]: v === 'internal' ? p[chatUserIdKey] : '',
                      [chatIdKey]: v === 'internal' ? p[chatIdKey] : '',
                    }));

                    if (v !== 'internal') {
                      patchDataJson({
                        [dataKeys.userId]: null,
                        [dataKeys.chatId]: null,
                      });
                    }
                  }}
                >
                  <MenuItem value="internal">Internal (App Action)</MenuItem>
                  <MenuItem value="external">External (Website URL)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {landingType === 'internal' ? (
              <>
                <Grid item xs={12}>
                  <ActionSelector
                    label="Internal Action"
                    value={internalAction || ''}
                    fullWidth
                    disabled={false}
                    onChange={(newVal) => {
                      setForm((p) => ({
                        ...p,
                        [internalKey]: newVal || '',
                        [chatUserIdKey]: '',
                        [chatIdKey]: '',
                      }));
                      patchDataJson({
                        [dataKeys.userId]: null,
                        [dataKeys.chatId]: null,
                      });
                    }}
                  />
                </Grid>
                {/* If internal action = open-chat -> pick chatId */}
                {safeTrim(form[internalKey]) === INTERNAL_ACTION_OPEN_CHAT && (
                  <Grid item xs={12}>
                    <ChatSelectorByUser
                      key={`cta${idx}-chat-${receiverReady ? receiverIdNum : 'none'}`}
                      userId={receiverReady ? receiverIdNum : undefined}
                      disabled={!receiverReady}
                      label="Select Chat *"
                      placeholder={receiverReady ? 'Search chat…' : 'Select receiver user first'}
                      onChatSelect={(chatId, otherUserId) => {
                        if (!chatId) {
                          setForm((p) => ({ ...p, [chatIdKey]: '', [chatUserIdKey]: '' }));
                          patchDataJson({ [dataKeys.userId]: null, [dataKeys.chatId]: null });
                          return;
                        }

                        setForm((p) => ({
                          ...p,
                          [chatIdKey]: String(chatId),
                          [chatUserIdKey]: otherUserId ? String(otherUserId) : '',
                        }));

                        patchDataJson({
                          [dataKeys.chatId]: Number(chatId),
                          [dataKeys.userId]: otherUserId ? Number(otherUserId) : null,
                        });
                      }}
                      fullWidth
                    />
                  </Grid>
                )}

                {/* If internal action = open-profile -> pick bot-id from chats */}
                {safeTrim(form[internalKey]) === INTERNAL_ACTION_OPEN_PROFILE && (
                  <Grid item xs={12}>
                    <ChatSelectorByUser
                      key={`cta${idx}-profile-${receiverReady ? receiverIdNum : 'none'}`}
                      userId={receiverReady ? receiverIdNum : undefined}
                      disabled={!receiverReady}
                      label="Select user from chats *"
                      placeholder={
                        receiverReady ? 'Search user from chats…' : 'Select receiver user first'
                      }
                      onChatSelect={(chatId, otherUserId) => {
                        if (!otherUserId) {
                          setForm((p) => ({ ...p, [chatUserIdKey]: '', [chatIdKey]: '' }));
                          patchDataJson({ [dataKeys.userId]: null, [dataKeys.chatId]: null });
                          return;
                        }

                        setForm((p) => ({
                          ...p,
                          [chatUserIdKey]: String(otherUserId),
                          [chatIdKey]: chatId ? String(chatId) : '',
                        }));

                        patchDataJson({
                          [dataKeys.userId]: Number(otherUserId),
                          [dataKeys.chatId]: chatId ? Number(chatId) : null,
                        });
                      }}
                      fullWidth
                    />
                  </Grid>
                )}
              </>
            ) : (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="External URL"
                  placeholder="https://example.com"
                  value={externalUrl}
                  onChange={(e) => setForm((p) => ({ ...p, [externalKey]: e.target.value }))}
                  error={targetMissingLocal || urlInvalidLocal}
                  helperText={
                    !needsTarget
                      ? 'Optional. Add title to enable CTA.'
                      : targetMissingLocal
                        ? 'Required when CTA title is provided'
                        : urlInvalidLocal
                          ? 'Must be absolute http/https URL'
                          : 'Opens when user clicks the CTA button'
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
            )}

            {(ctaTitleLocal || internalAction || externalUrl) && !ctaTitleLocal && (
              <Grid item xs={12}>
                <Alert severity="warning" variant="soft">
                  Please add a CTA title to enable this CTA.
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Grid>
    );
  };

  const previewCta1Url = safeTrim(
    form.cta1_landing_type === 'external'
      ? form.cta1_external_url
      : `internal:${safeTrim(form.cta1_internal_action)}`
  );

  const previewCta2Url = safeTrim(
    form.cta2_landing_type === 'external'
      ? form.cta2_external_url
      : `internal:${safeTrim(form.cta2_internal_action)}`
  );

  const previewContent = (
    <PreviewPanel
      form={form}
      title={title}
      body={body}
      cta1Title={safeTrim(form.cta1_title)}
      cta1Url={previewCta1Url}
      cta2Title={safeTrim(form.cta2_title)}
      cta2Url={previewCta2Url}
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
              bgcolor: 'success.lighter',
              color: 'success.main',
            }}
          >
            <Iconify icon="mdi:account-bell" width={{ xs: 20, sm: 24 }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: { xs: 14, sm: 18 }, fontWeight: 800, lineHeight: 1.1 }}>
              Send to User
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
              Single user notification
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ ml: { xs: 1, sm: 2 }, display: { xs: 'none', md: 'flex' } }}
            alignItems="center"
          >
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
            onClick={() => setShowPreview(!showPreview)}
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
          {isMobile ? (
            <Grid item xs={12}>
              {!showPreview ? (
                <Fade in={!showPreview} timeout={300}>
                  <Box>
                    <Stack spacing={2.5}>
                      <Alert severity={scheduledAtIsPast ? 'warning' : 'info'} variant="soft">
                        {scheduledAtIsPast
                          ? 'Scheduled time is in the past — it may queue immediately.'
                          : 'Send a notification to a specific user.'}
                      </Alert>

                      <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                          <Iconify icon="solar:widget-bold" width={20} />
                          <Typography sx={{ fontWeight: 900 }}>Basics</Typography>
                        </Stack>

                        <Grid container spacing={2.5}>
                          <Grid item xs={12}>
                            <UserSelector
                              label="Receiver User *"
                              placeholder="Search username or user id…"
                              valueId={receiverReady ? receiverIdNum : undefined}
                              onUserSelect={(id) =>
                                setForm((p) => ({ ...p, receiverId: id ? String(id) : '' }))
                              }
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': receiverInvalid
                                  ? {
                                      '& fieldset': { borderColor: 'error.main' },
                                      '&:hover fieldset': { borderColor: 'error.main' },
                                    }
                                  : {},
                              }}
                            />
                          </Grid>

                          <Grid item xs={12}>
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
                          <Grid item xs={12}>
                            <FormControl fullWidth>
                              <InputLabel>Priority</InputLabel>
                              <Select
                                value={form.priority}
                                label="Priority"
                                onChange={(e) =>
                                  setForm((p) => ({ ...p, priority: e.target.value }))
                                }
                              >
                                {PRIORITY_OPTIONS.map((opt) => (
                                  <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12}>
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

                          <Grid item xs={12}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                              <DateTimePicker
                                label="Schedule Send Time"
                                value={form.scheduled_at ? dayjs(form.scheduled_at) : null}
                                onChange={(newValue) => {
                                  setForm((p) => ({
                                    ...p,
                                    scheduled_at: newValue
                                      ? newValue.format('YYYY-MM-DDTHH:mm')
                                      : '',
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
                              label="Title"
                              value={form.title}
                              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                              error={titleTooLong}
                              helperText={`${title.length}/${MAX_TITLE}${titleTooLong ? ' — too long' : ''}`}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              required
                              multiline
                              rows={3}
                              label="Content"
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

                      {renderLandingSection()}

                      <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                          <Iconify icon="solar:cursor-square-bold" width={20} />
                          <Typography sx={{ fontWeight: 900 }}>Actions (CTAs)</Typography>
                        </Stack>

                        <Grid container spacing={2.5}>
                          {renderCtaBlock(1)}
                          {renderCtaBlock(2)}
                        </Grid>
                      </Paper>
                    </Stack>
                  </Box>
                </Fade>
              ) : (
                <Fade in={showPreview} timeout={300}>
                  <Box>{previewContent}</Box>
                </Fade>
              )}
            </Grid>
          ) : (
            <>
              <Grid item xs={12} lg={showPreview ? 7 : 12}>
                <Stack spacing={2.5}>
                  <Alert severity={scheduledAtIsPast ? 'warning' : 'info'} variant="soft">
                    {scheduledAtIsPast
                      ? 'Scheduled time is in the past — it may queue immediately.'
                      : 'Send a notification to a specific user.'}
                  </Alert>

                  {/* Basics */}
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                      <Iconify icon="solar:widget-bold" width={20} />
                      <Typography sx={{ fontWeight: 900 }}>Basics</Typography>
                    </Stack>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <UserSelector
                          label="Receiver User *"
                          placeholder="Search username or user id…"
                          valueId={receiverReady ? receiverIdNum : undefined}
                          onUserSelect={(id) =>
                            setForm((p) => ({ ...p, receiverId: id ? String(id) : '' }))
                          }
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': receiverInvalid
                              ? {
                                  '& fieldset': { borderColor: 'error.main' },
                                  '&:hover fieldset': { borderColor: 'error.main' },
                                }
                              : {},
                          }}
                        />
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

                  {/* Content */}
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
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          required
                          multiline
                          rows={3}
                          label="Content"
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

                  {renderLandingSection()}

                  {/* CTAs */}
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                      <Iconify icon="solar:cursor-square-bold" width={20} />
                      <Typography sx={{ fontWeight: 900 }}>Actions (CTAs)</Typography>
                    </Stack>

                    <Grid container spacing={2.5}>
                      {renderCtaBlock(1)}
                      {renderCtaBlock(2)}
                    </Grid>
                  </Paper>
                </Stack>
              </Grid>

              {showPreview && (
                <Grid item xs={12} lg={5}>
                  <Box sx={{ position: 'sticky', top: 16 }}>{previewContent}</Box>
                </Grid>
              )}
            </>
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
          {isSubmitting ? 'Sending...' : 'Send to User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

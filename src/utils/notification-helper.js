import { toast } from 'react-toastify';

import {
  Box,
  Chip,
  Grid,
  Stack,
  Paper,
  Alert,
  Select,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';

import { safeTrim } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import BotSelector from 'src/components/selectors/bot-selector';
import ActionSelector from 'src/components/selectors/single-notification-action-selector';

export function isProbablyUrl(v) {
  if (!v) return true;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export function safeJsonParse(str, fallback = {}) {
  if (!str) return fallback;
  try {
    const obj = JSON.parse(str);
    return obj && typeof obj === 'object' ? obj : fallback;
  } catch {
    return fallback;
  }
}

export const normalizePrefillFilters = (obj) => {
  const src = obj && typeof obj === 'object' ? obj : {};

  const toStr = (v) => (v === null || v === undefined ? '' : String(v));

  // countries can arrive in many forms
  const pickCountriesCsv = () => {
    const v =
      src.countries_csv ??
      src.countries ??
      src.country_csv ??
      src.country_codes ??
      src.countries_list ??
      '';

    // If array -> join
    if (Array.isArray(v)) return v.filter(Boolean).join(',');

    // If string -> return as is
    if (typeof v === 'string') return v;

    return '';
  };

  // last active days can have multiple key names
  const pickLastActiveDays = () => {
    const v =
      src.last_active_days ?? src.lastActiveDays ?? src.lastActive ?? src.active_days ?? '30';
    return toStr(v || '30');
  };

  // coin filters can come flat or nested
  const pickCoinOperator = () => {
    const v = src.coin_operator ?? src.coinOperator ?? src.coin?.operator ?? 'gte';
    return toStr(v || 'gte');
  };

  const pickCoinValue = () => {
    const v = src.coin_value ?? src.coinValue ?? src.coin?.value ?? '';
    return v === null || v === undefined ? '' : String(v);
  };

  return {
    countries_csv: pickCountriesCsv(),
    last_active_days: pickLastActiveDays(),
    coin_operator: pickCoinOperator() || 'gte',
    coin_value: pickCoinValue(),
  };
};


export function PreviewPanel({ form, title, body, cta1Title, cta1Url, cta2Title, cta2Url }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper', height: '100%' }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
        <Iconify icon="solar:monitor-smartphone-bold" width={24} />
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, sm: 16 } }}>
          Live Preview - All Platforms
        </Typography>
      </Stack>

      <Stack spacing={4}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Iconify icon="mdi:google-chrome" width={20} color="#4285F4" />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Chrome Desktop</Typography>
            <Chip size="small" label="Web" variant="outlined" />
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              bgcolor: '#f5f5f5',
              borderRadius: 2,
            }}
          >
            <ChromeDesktopPreview
              title={title}
              body={body}
              iconUrl={form.icon_url}
              imageUrl={form.image_url}
              landingUrl={form.landing_url}
              cta1Title={cta1Title}
              cta1Url={cta1Url}
              cta2Title={cta2Title}
              cta2Url={cta2Url}
            />
          </Box>
        </Box>

        <Divider />

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Iconify icon="mdi:android" width={20} color="#3DDC84" />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Android Mobile</Typography>
            <Chip size="small" label="Mobile" variant="outlined" />
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              bgcolor: '#e8f5e9',
              borderRadius: 2,
            }}
          >
            <AndroidMobilePreview
              title={title}
              body={body}
              iconUrl={form.icon_url}
              imageUrl={form.image_url}
              landingUrl={form.landing_url}
              cta1Title={cta1Title}
              cta1Url={cta1Url}
              cta2Title={cta2Title}
              cta2Url={cta2Url}
            />
          </Box>
        </Box>

        <Divider />

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Iconify icon="mdi:apple" width={20} color="#000" />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>iOS Mobile</Typography>
            <Chip size="small" label="Mobile" variant="outlined" />
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              bgcolor: '#fafafa',
              borderRadius: 2,
            }}
          >
            <IOSMobilePreview
              title={title}
              body={body}
              iconUrl={form.icon_url}
              imageUrl={form.image_url}
            />
          </Box>
          <Alert severity="info" variant="soft" sx={{ mt: 1.5 }}>
            iOS notifications don&apos;t support action buttons (CTAs)
          </Alert>
        </Box>

        <Divider />

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Iconify icon="mdi:microsoft-windows" width={20} color="#0078D4" />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Windows Desktop</Typography>
            <Chip size="small" label="Desktop" variant="outlined" />
          </Stack>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              bgcolor: '#1e1e1e',
              borderRadius: 2,
            }}
          >
            <WindowsDesktopPreview
              title={title}
              body={body}
              iconUrl={form.icon_url}
              imageUrl={form.image_url}
              landingUrl={form.landing_url}
            />
          </Box>
          <Alert severity="info" variant="soft" sx={{ mt: 1.5 }}>
            Windows notifications have limited support for action buttons
          </Alert>
        </Box>
      </Stack>
    </Paper>
  );
}

// ----------------------------------------------------------------------

export const META_FILTERS_TEMPLATE = {
  age_min: null,
  age_max: null,
  gender: '',
  country: '',
  state: '',
  city: '',
  region: '',
  type: '',
  is_active: null,
  status: null,
  last_active_days: null,
};


export function normalizeFiltersToTemplate(inputObj) {
  const out = { ...META_FILTERS_TEMPLATE };
  if (!inputObj || typeof inputObj !== 'object') return out;

  const src = { ...inputObj };

  if (src.receiver_gender !== undefined && src.gender === undefined)
    src.gender = src.receiver_gender;
  if (src.last_seen_days !== undefined && src.last_active_days === undefined) {
    src.last_active_days = src.last_seen_days;
  }

  Object.keys(out).forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
  });

  ['gender', 'country', 'state', 'city', 'region', 'type'].forEach((k) => {
    if (out[k] === null || out[k] === undefined) out[k] = '';
    if (typeof out[k] !== 'string') out[k] = String(out[k] ?? '');
  });

  ['age_min', 'age_max', 'last_active_days'].forEach((k) => {
    if (out[k] === '' || out[k] === undefined) out[k] = null;
  });

  return out;
}


export async function copyToClipboard(text) {
  try {
    if (!text) {
      toast.info('Nothing to copy.');
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success('Copied!');
  } catch (e) {
    console.error(e);
    toast.error('Copy failed (clipboard not allowed).');
  }
}

export const getIconSrc = (row) => {
  const v = row?.icon_url;
  if (v && /^https?:\/\//i.test(v)) return v;
  if (v) return `${CONFIG.assetsUrl}/${String(v).replace(/^\//, '')}`;
  return '';
};

export const buildOpenProfileUrl = (botId) => {
  const id = Number(botId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return `open-profile?bot_id=${id}`;
};

export const parseBotIdFromUrl = (url) => {
  try {
    const s = String(url || '').trim();
    if (!s) return '';

    const [path, qs] = s.split('?');
    if (path !== 'open-profile') return '';
    const p = new URLSearchParams(qs || '');
    const id = p.get('bot_id');
    return id && /^\d+$/.test(id) ? String(id) : '';
  } catch {
    return '';
  }
};

export const DATA_KEYS = {
  landing: { chatId: 'landing_chat_id', userId: 'landing_chat_user_id' },
  cta1: { chatId: 'cta1_chat_id', userId: 'cta1_chat_user_id' },
  cta2: { chatId: 'cta2_chat_id', userId: 'cta2_chat_user_id' },
};

export const buildInternalUrl = (action, extra = {}) => {
  const a = safeTrim(action);
  if (!a) return '';

  if (a === 'open-chat') {
    const chatId = Number(extra.chatId);
    if (!Number.isFinite(chatId) || chatId <= 0) return 'open-chat';
    return `open-chat?chat_id=${chatId}`;
  }

  if (a === 'open-profile') {
    const botId = Number(extra.botId); // <- you want bot-id
    if (!Number.isFinite(botId) || botId <= 0) return 'open-profile';
    return `open-profile?bot_id=${botId}`;
  }

  return a;
};

const INTERNAL_ACTION_OPEN_PROFILE = 'open-profile';
export function CtaCard({
  label,
  color = 'primary',
  cta,
  setCta,
  maxTitle = 40,
  titleValue,
  urlValue,
  urlInvalid,
  pairInvalid,
}) {
  const showBot =
    cta.landing_type === 'internal' && (cta.internal_action || '') === INTERNAL_ACTION_OPEN_PROFILE;

  return (
    <Paper
      variant="outlined"
      sx={(th) => ({
        p: 2,
        bgcolor: 'background.neutral',
        border: pairInvalid
          ? `2px solid ${th.palette.error.main}`
          : `1px solid ${th.palette.divider}`,
        borderRadius: 2,
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip label={label} size="small" color={color} sx={{ fontWeight: 800 }} />
        <Typography variant="body2" color="text.secondary">
          Optional
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {/* Title */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Button Title"
            value={cta.title}
            onChange={(e) => setCta((p) => ({ ...p, title: e.target.value }))}
            error={titleValue.length > maxTitle}
            helperText={`${titleValue.length}/${maxTitle}`}
            inputProps={{ maxLength: maxTitle }}
          />
        </Grid>

        {/* Type */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Landing Type</InputLabel>
            <Select
              value={cta.landing_type}
              label="Landing Type"
              onChange={(e) =>
                setCta((p) => ({
                  ...p,
                  landing_type: e.target.value,
                  // reset fields when switching type
                  internal_action: e.target.value === 'internal' ? p.internal_action || '' : '',
                  external_url: e.target.value === 'external' ? p.external_url || '' : '',
                  bot_id: e.target.value === 'internal' ? p.bot_id || '' : '',
                }))
              }
            >
              <MenuItem value="external">External URL</MenuItem>
              <MenuItem value="internal">Internal Action</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Target */}
        {cta.landing_type === 'external' ? (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Action URL"
              placeholder="https://example.com/page"
              value={cta.external_url}
              onChange={(e) => setCta((p) => ({ ...p, external_url: e.target.value }))}
              error={pairInvalid || (Boolean(urlValue) && urlInvalid)}
              helperText={
                pairInvalid ? 'Both title and URL are required' : 'Absolute http/https URL'
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
          <Grid item xs={12}>
            <ActionSelector
              label="Internal Action"
              placeholder="Select action..."
              value={cta.internal_action || ''}
              onChange={(val) =>
                setCta((p) => ({
                  ...p,
                  internal_action: val || '',
                  // reset bot if action changes away from open-profile
                  bot_id: (val || '') === INTERNAL_ACTION_OPEN_PROFILE ? p.bot_id || '' : '',
                }))
              }
              fullWidth
              helperText={
                pairInvalid ? 'Both title and internal action are required' : 'Triggers app action'
              }
              error={pairInvalid}
            />
          </Grid>
        )}

        {showBot && (
          <Grid item xs={12}>
            <BotSelector
              label={`${label}: Select Bot *`}
              placeholder="Search bot..."
              valueId={cta.bot_id ? Number(cta.bot_id) : undefined}
              onBotSelect={(id) =>
                setCta((p) => ({
                  ...p,
                  bot_id: id ? String(id) : '',
                }))
              }
              fullWidth
            />

            {!String(cta.bot_id || '').trim() && (
              <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                Bot is required for <b>{label} open-profile</b>.
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
      </Grid>
    </Paper>
  );
}

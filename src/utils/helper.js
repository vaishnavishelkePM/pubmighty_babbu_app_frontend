import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';

import { alpha, useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Card,
  Grid,
  Stack,
  Paper,
  Button,
  Select,
  Skeleton,
  Collapse,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
} from '@mui/material';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

export const setCookie = (name, value, options = {}) => {
  let cookie = `${name}=${encodeURIComponent(value)}; path=/`;
  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  if (options.secure) {
    cookie += `; Secure`;
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  document.cookie = cookie;
};

// Function to set session cookies
export const setSessionCookies = (sessionKey, sessionExpiration) => {
  const currentTime = new Date().getTime();
  const expirationTime = new Date(sessionExpiration).getTime();

  console.log('currentTime', currentTime);
  console.log('expirationTime: ', expirationTime);
  // Calculate Max-Age in seconds
  const maxAge = Math.floor((expirationTime - currentTime) / 1000);
  console.log('maxAge: ', expirationTime);

  if (maxAge > 0) {
    // Set session_key with calculated Max-Age
    setCookie('session_key', sessionKey, {
      maxAge,
      sameSite: 'Strict',
      secure: false,
    });

    // Optionally, set session_expiration cookie (for debugging or client-side use)
    setCookie('session_expiration', sessionExpiration, {
      maxAge,
      sameSite: 'Strict',
      secure: false,
    });
  } else {
    console.error('Session expiration time is in the past.');
  }
};
export const safeTrim = (v) => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

// Utility to get a cookie value by name
export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

// Utility to delete a cookie
export const deleteCookie = (name) => {
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Strict; Secure`;
};

export const safeParse = (json) => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export function formatNumber(num, digits = 1) {
  if (num === null || num === undefined || isNaN(num)) return '0';

  const units = [
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' },
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      return (
        (num / unit.value).toFixed(digits).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + unit.symbol
      );
    }
  }

  return num.toString();
}

export function stringToArray(text) {
  console.log('text', text);
  const raw = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log('raw', raw);

  return raw;
}

export function buildSocialUrl(type, id, name = '') {
  if (!type || !id) return null;

  // if user already pasted a full link, just use it
  if (/^https?:\/\//i.test(id)) return id;

  const t = String(type).toLowerCase().trim();
  const v = String(id).trim();

  switch (t) {
    case 'whatsapp': {
      const digits = (v || '').replace(/\D/g, '');
      // wa.me needs an E.164-ish number; fallback to a generic message if not a number
      return digits
        ? `https://wa.me/${digits}`
        : `https://wa.me/?text=${encodeURIComponent(`Hi ${name || ''}`)}`;
    }

    case 'telegram': {
      const user = v.replace(/^@/, '');
      return `https://t.me/${user}`;
    }

    case 'teams': {
      // works if the contact id is an email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(v)}`;
      }
      // otherwise assume it’s a full link or nothing usable
      return null;
    }

    case 'messenger': {
      // user/page id or vanity: m.me/<id>
      const user = v.replace(/^@/, '');
      return `https://m.me/${user}`;
    }

    case 'line': {
      // prefer web fallback that opens app if installed
      const user = v.startsWith('@') ? v : `@${v}`;
      return `https://line.me/R/ti/p/${encodeURIComponent(user)}`;
    }

    default:
      return null;
  }
}

export const queryStringFrom = (filter, page) => {
  const qp = new URLSearchParams();
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) qp.append(k, v);
    });
  }
  if (page) qp.append('page', page);
  return qp.toString();
};

export const capitalize = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const formatDateTime = (d) => (d ? dayjs(d).format('DD MMM YYYY, hh:mm A') : '—');

// -----------------------------
// Analytics Helpers
// -----------------------------
export const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

export const safeJoin = (base, path) => {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
};

export const getSessionToken = () => {
  // Uses your existing getCookie helper
  let token = getCookie('session_key');
  if (!token && typeof window !== 'undefined') {
    token = window.localStorage.getItem('session_key');
  }
  return token || null;
};

//  map here so all tabs u
export const COUNTRY_NAMES = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  BR: 'Brazil',
  MX: 'Mexico',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  PL: 'Poland',
  RU: 'Russia',
  TR: 'Turkey',
  SA: 'Saudi Arabia',
  AE: 'UAE',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  PT: 'Portugal',
  GR: 'Greece',
  IE: 'Ireland',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  UA: 'Ukraine',
  IL: 'Israel',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  AG: 'Antigua and Barbuda',
  AO: 'Angola',
};

export const getCountryName = (code) => {
  if (!code || code === 'Unknown') return 'Unknown';
  return COUNTRY_NAMES[String(code).toUpperCase()] || code;
};

export const formatCurrencyCompactINR = (amount) => {
  const n = Number(amount || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
};

//notification

// export function PreviewPanel({ form, title, body, cta1Title, cta1Url, cta2Title, cta2Url }) {
//   const effectiveLandingUrl =
//     form.landing_type === 'external'
//       ? safeTrim(form.landing_external_url)
//       : form.landing_type === 'internal'
//         ? `internal:${safeTrim(form.landing_internal_action)}`
//         : '';

//   return (
//     <Paper
//       variant="outlined"
//       sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper', height: '100%' }}
//     >
//       <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
//         <Iconify icon="solar:monitor-smartphone-bold" width={24} />
//         <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, sm: 16 } }}>
//           Live Preview - All Platforms
//         </Typography>
//       </Stack>

//       <Stack spacing={4}>
//         <Box>
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
//             <Iconify icon="mdi:google-chrome" width={20} color="#4285F4" />
//             <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Chrome Desktop</Typography>
//             <Chip size="small" label="Web" variant="outlined" />
//           </Stack>

//           <Box
//             sx={{
//               display: 'flex',
//               justifyContent: 'center',
//               p: 2,
//               bgcolor: '#f5f5f5',
//               borderRadius: 2,
//             }}
//           >
//             <ChromeDesktopPreview
//               title={title}
//               body={body}
//               iconUrl={form.icon_url}
//               imageUrl={form.image_url}
//               landingUrl={effectiveLandingUrl}
//               cta1Title={cta1Title}
//               cta1Url={cta1Url}
//               cta2Title={cta2Title}
//               cta2Url={cta2Url}
//             />
//           </Box>
//         </Box>

//         <Divider />

//         <Box>
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
//             <Iconify icon="mdi:android" width={20} color="#3DDC84" />
//             <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Android Mobile</Typography>
//             <Chip size="small" label="Mobile" variant="outlined" />
//           </Stack>

//           <Box
//             sx={{
//               display: 'flex',
//               justifyContent: 'center',
//               p: 2,
//               bgcolor: '#e8f5e9',
//               borderRadius: 2,
//             }}
//           >
//             <AndroidMobilePreview
//               title={title}
//               body={body}
//               iconUrl={form.icon_url}
//               imageUrl={form.image_url}
//               landingUrl={effectiveLandingUrl}
//               cta1Title={cta1Title}
//               cta1Url={cta1Url}
//               cta2Title={cta2Title}
//               cta2Url={cta2Url}
//             />
//           </Box>
//         </Box>

//         <Divider />

//         <Box>
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
//             <Iconify icon="mdi:apple" width={20} color="#000" />
//             <Typography sx={{ fontWeight: 700, fontSize: 14 }}>iOS Mobile</Typography>
//             <Chip size="small" label="Mobile" variant="outlined" />
//           </Stack>

//           <Box
//             sx={{
//               display: 'flex',
//               justifyContent: 'center',
//               p: 2,
//               bgcolor: '#fafafa',
//               borderRadius: 2,
//             }}
//           >
//             <IOSMobilePreview
//               title={title}
//               body={body}
//               iconUrl={form.icon_url}
//               imageUrl={form.image_url}
//             />
//           </Box>

//           <Alert severity="info" variant="soft" sx={{ mt: 1.5 }}>
//             iOS notifications don&apos;t support action buttons (CTAs)
//           </Alert>
//         </Box>

//         <Divider />

//         <Box>
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
//             <Iconify icon="mdi:microsoft-windows" width={20} color="#0078D4" />
//             <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Windows Desktop</Typography>
//             <Chip size="small" label="Desktop" variant="outlined" />
//           </Stack>

//           <Box
//             sx={{
//               display: 'flex',
//               justifyContent: 'center',
//               p: 2,
//               bgcolor: '#1e1e1e',
//               borderRadius: 2,
//             }}
//           >
//             <WindowsDesktopPreview
//               title={title}
//               body={body}
//               iconUrl={form.icon_url}
//               imageUrl={form.image_url}
//               landingUrl={effectiveLandingUrl}
//             />
//           </Box>

//           <Alert severity="info" variant="soft" sx={{ mt: 1.5 }}>
//             Windows notifications have limited support for action buttons
//           </Alert>
//         </Box>
//       </Stack>
//     </Paper>
//   );
// }

const INTERNAL_ACTION_OPEN_PROFILE = 'open-profile';

// export function CtaCard({
//   label,
//   color = 'primary',
//   cta,
//   setCta,
//   maxTitle = 40,
//   titleValue,
//   urlValue,
//   urlInvalid,
//   pairInvalid,
// }) {
//   const showBot =
//     cta.landing_type === 'internal' && (cta.internal_action || '') === INTERNAL_ACTION_OPEN_PROFILE;

//   return (
//     <Paper
//       variant="outlined"
//       sx={(th) => ({
//         p: 2,
//         bgcolor: 'background.neutral',
//         border: pairInvalid
//           ? `2px solid ${th.palette.error.main}`
//           : `1px solid ${th.palette.divider}`,
//         borderRadius: 2,
//       })}
//     >
//       <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
//         <Chip label={label} size="small" color={color} sx={{ fontWeight: 800 }} />
//         <Typography variant="body2" color="text.secondary">
//           Optional
//         </Typography>
//       </Stack>

//       <Grid container spacing={2}>
//         {/* Title */}
//         <Grid item xs={12} md={6}>
//           <TextField
//             fullWidth
//             label="Button Title"
//             value={cta.title}
//             onChange={(e) => setCta((p) => ({ ...p, title: e.target.value }))}
//             error={titleValue.length > maxTitle}
//             helperText={`${titleValue.length}/${maxTitle}`}
//             inputProps={{ maxLength: maxTitle }}
//           />
//         </Grid>

//         {/* Type */}
//         <Grid item xs={12} md={6}>
//           <FormControl fullWidth>
//             <InputLabel>Landing Type</InputLabel>
//             <Select
//               value={cta.landing_type}
//               label="Landing Type"
//               onChange={(e) =>
//                 setCta((p) => ({
//                   ...p,
//                   landing_type: e.target.value,
//                   // reset fields when switching type
//                   internal_action: e.target.value === 'internal' ? p.internal_action || '' : '',
//                   external_url: e.target.value === 'external' ? p.external_url || '' : '',
//                   bot_id: e.target.value === 'internal' ? p.bot_id || '' : '',
//                 }))
//               }
//             >
//               <MenuItem value="external">External URL</MenuItem>
//               <MenuItem value="internal">Internal Action</MenuItem>
//             </Select>
//           </FormControl>
//         </Grid>

//         {/* Target */}
//         {cta.landing_type === 'external' ? (
//           <Grid item xs={12}>
//             <TextField
//               fullWidth
//               label="Action URL"
//               placeholder="https://example.com/page"
//               value={cta.external_url}
//               onChange={(e) => setCta((p) => ({ ...p, external_url: e.target.value }))}
//               error={pairInvalid || (Boolean(urlValue) && urlInvalid)}
//               helperText={
//                 pairInvalid ? 'Both title and URL are required' : 'Absolute http/https URL'
//               }
//               InputProps={{
//                 startAdornment: (
//                   <InputAdornment position="start">
//                     <Iconify icon="mdi:link" />
//                   </InputAdornment>
//                 ),
//               }}
//             />
//           </Grid>
//         ) : (
//           <Grid item xs={12}>
//             <ActionSelector
//               label="Internal Action"
//               placeholder="Select action..."
//               value={cta.internal_action || ''}
//               onChange={(val) =>
//                 setCta((p) => ({
//                   ...p,
//                   internal_action: val || '',
//                   // reset bot if action changes away from open-profile
//                   bot_id: (val || '') === INTERNAL_ACTION_OPEN_PROFILE ? p.bot_id || '' : '',
//                 }))
//               }
//               fullWidth
//               helperText={
//                 pairInvalid ? 'Both title and internal action are required' : 'Triggers app action'
//               }
//               error={pairInvalid}
//             />
//           </Grid>
//         )}

//         {showBot && (
//           <Grid item xs={12}>
//             <BotSelector
//               label={`${label}: Select Bot *`}
//               placeholder="Search bot..."
//               valueId={cta.bot_id ? Number(cta.bot_id) : undefined}
//               onBotSelect={(id) =>
//                 setCta((p) => ({
//                   ...p,
//                   bot_id: id ? String(id) : '',
//                 }))
//               }
//               fullWidth
//             />

//             {!String(cta.bot_id || '').trim() && (
//               <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
//                 Bot is required for <b>{label} open-profile</b>.
//               </Typography>
//             )}

//             <Typography
//               variant="caption"
//               color="text.secondary"
//               sx={{ mt: 0.75, display: 'block' }}
//             >
//               Will save: <code>open-profile?bot_id=XYZ</code>
//             </Typography>
//           </Grid>
//         )}
//       </Grid>
//     </Paper>
//   );
// }

export function appendIfSet(fd, key, val) {
  if (!isBlank(val)) fd.append(key, String(val));
}

//summary view

export function KpiCard({
  title,
  value,
  icon,
  color = 'primary',
  subtitle,
  trend,
  loading = false,
  rightSlot,
}) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card sx={{ p: 3, height: '100%', boxShadow: theme.customShadows?.card }}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="80%" height={48} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme.customShadows?.card,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { boxShadow: theme.customShadows?.z12, transform: 'translateY(-4px)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.palette[color].main}, ${theme.palette[color].dark})`,
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontSize: '0.75rem',
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="h3"
            sx={{
              mb: 0.5,
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>

          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}

          {trend !== undefined && trend !== null && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor:
                    trend >= 0
                      ? alpha(theme.palette.success.main, 0.16)
                      : alpha(theme.palette.error.main, 0.16),
                }}
              >
                <Iconify
                  icon={trend >= 0 ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
                  width={16}
                  sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }}
                />
              </Box>

              <Typography
                variant="subtitle2"
                sx={{
                  color: trend >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                {Math.abs(trend)}%
              </Typography>

              <Typography variant="caption" color="text.secondary">
                vs last period
              </Typography>
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.12)} 0%, ${alpha(
              theme.palette[color].main,
              0.24
            )} 100%)`,
            color: `${color}.main`,
            flexShrink: 0,
          }}
        >
          {rightSlot || <Iconify icon={icon} width={36} />}
        </Box>
      </Stack>
    </Card>
  );
}

export function ChartSkeleton({ height = 400 }) {
  return (
    <Card sx={{ p: 3, height }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
      <Skeleton variant="rectangular" width="100%" height={height - 100} sx={{ borderRadius: 1 }} />
    </Card>
  );
}
const DATE_PRESETS = [
  { label: 'Last 1 Day', days: 1 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 60 Days', days: 60 },
  { label: 'Last 90 Days', days: 90 },
];

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        py: 12,
        textAlign: 'center',
        borderRadius: 2,
        borderStyle: 'dashed',
        bgcolor: 'background.neutral',
      }}
    >
      <Iconify icon={icon} width={80} sx={{ color: 'text.disabled', mb: 3, opacity: 0.5 }} />
      <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
        {subtitle}
      </Typography>
      {action}
    </Paper>
  );
}

export function DateFilters({
  control,
  onApply,
  onReset,
  loading,
  onPresetSelect,
  selectedPreset,
  showCustomRange,
  onToggleCustomRange,
  open,
  onToggleOpen,
}) {
  const filterValue = showCustomRange ? 'custom' : String(selectedPreset ?? 30);

  const handleDropdownChange = (e) => {
    const v = e.target.value;

    if (v === 'custom') {
      onToggleCustomRange(true);
      return;
    }

    onToggleCustomRange(false);
    onPresetSelect(Number(v));
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: open ? 2 : 0 }}>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => onToggleOpen(!open)}
          startIcon={<Iconify icon={open ? 'eva:close-fill' : 'stash:filter'} />}
        >
          {open ? 'Hide Filter' : 'Show Filter'}
        </Button>
      </Stack>

      <Collapse in={open}>
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter"
                value={filterValue}
                onChange={handleDropdownChange}
                disabled={loading}
              >
                {DATE_PRESETS.map((p) => (
                  <MenuItem key={p.days} value={String(p.days)}>
                    {p.label}
                  </MenuItem>
                ))}
                <MenuItem value="custom">Custom Range</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Controller
                  name="from"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="From Date"
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        onToggleCustomRange(true);
                      }}
                      maxDate={new Date()}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Controller
                  name="to"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="To Date"
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        onToggleCustomRange(true);
                      }}
                      maxDate={new Date()}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="contained"
              disabled={loading}
              onClick={onApply}
              startIcon={<Iconify icon="eva:search-fill" />}
              sx={{ height: 40 }}
            >
              Apply
            </Button>

            <Button
              variant="outlined"
              disabled={loading}
              onClick={onReset}
              startIcon={<Iconify icon="eva:refresh-fill" />}
              sx={{ height: 40 }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}

//revenue view
const SORT_OPTIONS = [
  { value: 'highest_revenue', label: 'Highest Revenue', icon: 'solar:sort-vertical-bold' },
  { value: 'lowest_revenue', label: 'Lowest Revenue', icon: 'solar:sort-vertical-bold' },
  { value: 'highest_purchases', label: 'Highest Purchases', icon: 'solar:sort-vertical-bold' },
  { value: 'lowest_purchases', label: 'Lowest Purchases', icon: 'solar:sort-vertical-bold' },
];

export function TableSortFilter({ value, onChange, disabled, label = 'Sort By' }) {
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="sort-filter-label">{label}</InputLabel>
      <Select
        labelId="sort-filter-label"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        label={label}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon={option.icon} width={16} />
              <Typography variant="body2">{option.label}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

//update profile

export function SectionTitle({ children, sx }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, ...sx }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
      <Typography
        variant="overline"
        sx={{
          color: 'text.secondary',
          letterSpacing: 1,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

export function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export async function copyToClipboard(text) {
  try {
    if (!text) return false;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

export function guessKindFromMime(mime = '') {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return 'file';
}
export function guessKindFromName(name = '') {
  const n = String(name || '').toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(n)) return 'image';
  if (/\.(mp4|webm|mov|mkv)$/i.test(n)) return 'video';
  if (/\.(mp3|wav|aac|m4a|ogg)$/i.test(n)) return 'audio';
  return 'file';
}
export function getMediaKind(file) {
  const k = guessKindFromMime(file?.mime_type);
  return k !== 'file' ? k : guessKindFromName(file?.name);
}

export function probeImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}
export function probeVideo(url) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const done = (ok) => {
      v.onloadedmetadata = null;
      v.onerror = null;
      resolve(ok);
    };
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    v.preload = 'metadata';
    v.src = url;
  });
}
export async function probeUrl(url, kind) {
  if (!url) return false;
  if (kind === 'image') return probeImage(url);
  if (kind === 'video') return probeVideo(url);
  return true;
}

export function bubbleSx(alignRight, deleted) {
  return (theme) => ({
    maxWidth: '78%',
    px: 1.6,
    py: 1.2,
    borderRadius: 2.4,
    bgcolor: alignRight ? theme.palette.primary.main : theme.palette.background.paper,
    color: alignRight ? theme.palette.primary.contrastText : theme.palette.text.primary,
    border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
    boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.08)}`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    position: 'relative',
    opacity: deleted ? 0.58 : 1,
    '&:hover': {
      boxShadow: deleted
        ? `0 10px 26px ${alpha(theme.palette.common.black, 0.06)}`
        : `0 14px 34px ${alpha(theme.palette.common.black, 0.1)}`,
    },
  });
}
export function apiUrl(pathWithQs = '') {
  return `${String(CONFIG.apiUrl || '').replace(/\/+$/, '')}${pathWithQs}`;
}

export function SectionHeader({ title, description, icon }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
      <Iconify icon={icon} width={24} sx={{ color: 'primary.main', mt: 0.5 }} />
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

export function avatarSrc(u) {
  if (!u) return '/assets/images/avatar_default.png';

  const av = u?.avatar || '';
  if (!av) return '/assets/images/avatar_default.png';

  if (String(av).startsWith('http')) return av;

  let path = String(av);

  if (!path.startsWith('uploads/')) path = `uploads/avatar/user/${path}`;
  const raw = safeJoin(CONFIG.assetsUrl, path);

  const v = u?.updated_at || u?.updatedAt || u?.created_at || u?.createdAt || Date.now();
  return raw.includes('?')
    ? `${raw}&v=${encodeURIComponent(v)}`
    : `${raw}?v=${encodeURIComponent(v)}`;
}

export const coverSrc = (cover) => {
  if (!cover) return '';
  if (String(cover).startsWith('http')) return String(cover);
  return safeJoin(CONFIG.assetsUrl, `images/coin-packages/${cover}`);
};

export const toText = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

export const getAvatarUrl = (avatar, versionKey) => {
  if (!avatar) return '';
  const av = String(avatar);
  if (/^https?:\/\//i.test(av)) return av;
  const base = process.env.NEXT_PUBLIC_SERVER_URL;
  const cleanBase = String(base).replace(/\/+$/, '');
  const cleanPath = av.replace(/^\/+/, '');
  if (cleanPath.startsWith('uploads/')) {
    const url = `${cleanBase}/${cleanPath}`;
    return versionKey ? `${url}?v=${encodeURIComponent(versionKey)}` : url;
  }
  const url = `${cleanBase}/uploads/avatar/user/${encodeURIComponent(cleanPath)}`;
  return versionKey ? `${url}?v=${encodeURIComponent(versionKey)}` : url;
};

export function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function buildQuery(filters) {
  const qp = new URLSearchParams();
  if (filters.status !== '' && filters.status !== null && typeof filters.status !== 'undefined') {
    // backend accepts boolean or "true"/"false"
    qp.append('status', String(filters.status));
  }
  if (
    filters.provider_name !== '' &&
    filters.provider_name !== null &&
    typeof filters.provider_name !== 'undefined'
  ) {
    qp.append('provider_name', String(filters.provider_name).trim());
  }
  return qp.toString();
}

export const COUNTRY_COLORS = [
  '#6366F1',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
];

export const RANK_MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

/**
 * Format file size in bytes to human readable string
 *
 * Examples:
 *  - 512        → "512 B"
 *  - 1024       → "1 KB"
 *  - 15360      → "15 KB"
 *  - 1048576    → "1 MB"
 *  - 1073741824 → "1 GB"
 *
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatFileSize(bytes, decimals = 0) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';

  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

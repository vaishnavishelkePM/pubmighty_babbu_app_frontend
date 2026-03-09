import { getCookie } from 'minimal-shared';

import { Box } from '@mui/material';

import { CONFIG } from 'src/global-config';

export function safeJoin(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

export function isFileLike(x) {
  if (!x) return false;
  if (typeof File !== 'undefined' && x instanceof File) return true;
  return typeof x === 'object' && x?.name && x?.size >= 0 && x?.type;
}

export function getUploadsBaseUrl() {
  if (CONFIG?.uploadsUrl) return String(CONFIG.uploadsUrl);
  try {
    return new URL(String(CONFIG.apiUrl || '')).origin;
  } catch (e) {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }
}
export function publicUrlFromPath(p) {
  const base = getUploadsBaseUrl();
  const s = String(p || '').trim();
  if (!s) return '';
  if (s.startsWith('http')) return s;
  const normalized = s.startsWith('/') ? s : `/${s}`;
  return safeJoin(base, normalized);
}

export function isHttpUrl(v) {
  return !!v && /^https?:\/\//i.test(String(v));
}

export function normalizePath(p) {
  return String(p || '').replace(/^\/+/, '');
}


export function getFilePublicUrl(file) {
  if (!file) return '';

  const direct =
    file.url ||
    file.file_url ||
    file.public_url ||
    file.publicUrl ||
    file.path ||
    file.file_path ||
    file.filePath ||
    file.relative_path ||
    file.relativePath ||
    '';

  if (isHttpUrl(direct)) return direct;

  if (String(direct).startsWith('uploads/'))
    return safeJoin(CONFIG.assetsUrl, normalizePath(direct));

  const folders = file.folders || file.folder || '';
  const name = file.name || file.file_name || file.filename || '';
  const rel = [folders, name].filter(Boolean).join('/');

  if (String(rel).startsWith('uploads/')) return safeJoin(CONFIG.assetsUrl, normalizePath(rel));

  if (name) return safeJoin(CONFIG.assetsUrl, normalizePath(`uploads/${name}`));

  return '';
}
export function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>; //
}

//edit

export const heightStringToInt = (v) => {
  const s = String(v || '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
};

export const safeTrim = (v) => (typeof v === 'string' ? v.trim() : '');


export function normalizeCSV6(s) {
  const items = String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const it of items) {
    const k = it.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(it);
    }
  }
  return unique.slice(0, 6).join(', ');
}
export function fileSize(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function getImageSrc(row, botId) {
  const p = String(row?.image_path || '').trim();
  const n = String(row?.name || '').trim();

  if (p.startsWith('http')) return p;
  if (p.startsWith('/uploads/') || p.startsWith('uploads/')) return publicUrlFromPath(p);

  const filename = n || p;
  if (!filename) return '';

  return publicUrlFromPath(`/uploads/media/user/${botId}/${filename}`);
}

export function getVideoSrc(v, botId) {
  const p = String(v?.video_path || '').trim();
  const n = String(v?.name || '').trim();

  if (p.startsWith('http')) return p;
  if (p.startsWith('/uploads/') || p.startsWith('uploads/')) return publicUrlFromPath(p);

  const filename = n || p;
  if (!filename) return '';

  return publicUrlFromPath(`/uploads/videos/${botId}/${filename}`);
}


export const tokenHelpText = (t) => {
  if (t.key.startsWith('bot.')) return `Replaced with the Bot's ${t.label}`;
  if (t.key.startsWith('user.')) return `Replaced with the User's ${t.label}`;
  return 'Dynamic Variable';
};

'use client';

import React, { useState } from 'react';

import {
  Stack,
  Tooltip,
  IconButton,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
// adjust the path if needed

export default function KVRow({ label, value, copyable = false, secure = false, monospace = false, textTransform="capitalize" }) {
  const [reveal, setReveal] = useState(false);
  const val = value ?? '—';
  const masked =
    secure && !reveal && typeof val === 'string'
      ? val.replace(/.(?=.{4})/g, '•')
      : val;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value ?? ''));
    } catch {
      // swallow
    }
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        py: 1,
        gap: 1.5,
        borderBottom: (t) => `1px dashed ${t.palette.divider}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 140 }}>
        {label}
      </Typography>

      <Stack direction="row" alignItems="center" sx={{ gap: 0.5, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontFamily: monospace ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            textTransform:{textTransform},
            maxWidth: { xs: 180, sm: 260 },
          }}
          title={String(value ?? '')}
        >
          {masked || '—'}
        </Typography>

        {secure && !!value && (
          <Tooltip title={reveal ? 'Hide' : 'Reveal'}>
            <IconButton size="small" onClick={() => setReveal((r) => !r)}>
              <Iconify icon={reveal ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
            </IconButton>
          </Tooltip>
        )}

        {copyable && !!value && (
          <Tooltip title="Copy">
            <IconButton size="small" onClick={handleCopy}>
              <Iconify icon="mdi:content-copy" width={18} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
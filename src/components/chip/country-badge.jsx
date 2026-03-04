'use client';

import { useMemo } from 'react';
import ReactCountryFlag from 'react-country-flag';

import { Box, Stack, Typography } from '@mui/material';

import { countries } from 'src/assets/data';

function normalizeCountryCode(code) {
  const raw = String(code ?? '')
    .trim()
    .toUpperCase();

  if (!raw || ['NULL', 'UNDEFINED', 'N/A', '-'].includes(raw)) return '';
  if (!/^[A-Z]{2}$/.test(raw)) return '';

  return raw;
}

export default function CountryBadge({ code, size = 22, showPhone = true, sx = {} }) {
  const upper = normalizeCountryCode(code);

  const meta = useMemo(() => {
    if (!upper) return null;
    return countries.find((c) => String(c.code).toUpperCase() === upper) || null;
  }, [upper]);

  //  UNKNOWN
  if (!upper) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, ...sx }}>
        <span style={{ fontSize: size, lineHeight: 1 }}>🌍</span>
        <Typography variant="body2" color="text.secondary">
          Unknown
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        borderRadius: 2,
        px: 1,
        py: 0.5,
        ...sx,
      }}
    >
      <ReactCountryFlag countryCode={upper} svg style={{ width: size, height: size }} />

      <Stack spacing={0}>
        <Typography variant="body2" noWrap>
          {meta?.label || 'Unknown'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {upper}
          {showPhone && meta?.phone ? ` (+${meta.phone})` : ''}
        </Typography>
      </Stack>
    </Box>
  );
}

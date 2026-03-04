'use client';

import { Box, Avatar, IconButton, Typography } from '@mui/material';

import { safeTrim } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

// const getLandingHost = (landingUrl) => {
//   const s = (landingUrl || '').trim();
//   if (!s) return 'yoursite.com';

//   if (s.startsWith('internal:')) return 'In-App';

//   try {
//     getLandingHost(landingUrl);
//   } catch {
//     return 'yoursite.com';
//   }
// };

const getLandingHost = (landingUrl) => {
  const s = (landingUrl || '').trim();
  if (!s) return 'yoursite.com';

  if (s.startsWith('internal:')) return 'In-App';

  try {
    return new URL(s).hostname || 'yoursite.com';
  } catch {
    return 'yoursite.com';
  }
};

export default function WindowsDesktopPreview({ title, body, iconUrl, imageUrl, landingUrl }) {
  const hasImage = !!safeTrim(imageUrl);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        bgcolor: '#2d2d30',
        borderRadius: 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          borderBottom: '1px solid #3e3e42',
        }}
      >
        <Avatar
          src={safeTrim(iconUrl) || ''}
          sx={{
            width: 24,
            height: 24,
            bgcolor: '#1e1e1e',
          }}
        >
          <Iconify icon="mdi:bell" width={14} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {landingUrl ? getLandingHost(landingUrl) : 'Your App'}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: '#fff', width: 20, height: 20 }}>
          <Iconify icon="mdi:close" width={14} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {hasImage && (
          <Box
            component="img"
            src={safeTrim(imageUrl)}
            alt="notification"
            sx={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
              borderRadius: 1,
              mb: 1.5,
              bgcolor: '#1e1e1e',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff', mb: 0.5 }}>
          {title || 'Notification title preview'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#b3b3b3', lineHeight: 1.4 }}>
          {body || 'Notification body preview'}
        </Typography>
      </Box>
    </Box>
  );
}

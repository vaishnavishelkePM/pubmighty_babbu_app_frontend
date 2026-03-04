

'use client';

import { Box, Stack, Avatar, Button, IconButton, Typography } from '@mui/material';

import { safeTrim } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

const getLandingHost = (landingUrl) => {
  const s = (landingUrl || '').trim();
  if (!s) return 'yoursite.com';

  // internal actions like "internal:open_chat"
  if (s.startsWith('internal:')) return 'In-App';

  // accept only real URLs
  try {
    return new URL(s).hostname || 'yoursite.com';
  } catch {
    return 'yoursite.com';
  }
};

export default function ChromeDesktopPreview({
  title,
  body,
  iconUrl,
  imageUrl,
  landingUrl,
  cta1Title,
  cta1Url,
  cta2Title,
  cta2Url,
}) {
  const hasImage = !!safeTrim(imageUrl);
  const hasCTA1 = !!safeTrim(cta1Title) && !!safeTrim(cta1Url);
  const hasCTA2 = !!safeTrim(cta2Title) && !!safeTrim(cta2Url);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 400,
        bgcolor: '#fff',
        borderRadius: 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Avatar
          src={safeTrim(iconUrl) || ''}
          sx={{
            width: 20,
            height: 20,
            bgcolor: '#f5f5f5',
          }}
        >
          <Iconify icon="mdi:bell" width={12} />
        </Avatar>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#5f6368', flex: 1 }}>
          {getLandingHost(landingUrl)}
        </Typography>
        <IconButton size="small" sx={{ width: 20, height: 20 }}>
          <Iconify icon="mdi:cog" width={14} />
        </IconButton>
        <IconButton size="small" sx={{ width: 20, height: 20 }}>
          <Iconify icon="mdi:close" width={14} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#202124', mb: 0.5 }}>
          {title || 'Notification title preview'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#5f6368', lineHeight: 1.4 }}>
          {body || 'Notification body preview'}
        </Typography>

        {/* Image */}
        {hasImage && (
          <Box
            component="img"
            src={safeTrim(imageUrl)}
            alt="notification"
            sx={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              borderRadius: 1,
              mt: 1.5,
              bgcolor: '#f5f5f5',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Action Buttons */}
        {(hasCTA1 || hasCTA2) && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid #e8eaed',
            }}
          >
            {hasCTA1 && (
              <Button
                variant="text"
                size="small"
                fullWidth
                sx={{
                  textTransform: 'uppercase',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#1a73e8',
                  py: 0.75,
                  px: 2,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: '#e8f0fe',
                  },
                }}
              >
                {cta1Title}
              </Button>
            )}
            {hasCTA2 && (
              <Button
                variant="text"
                size="small"
                fullWidth
                sx={{
                  textTransform: 'uppercase',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#1a73e8',
                  py: 0.75,
                  px: 2,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: '#e8f0fe',
                  },
                }}
              >
                {cta2Title}
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

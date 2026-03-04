'use client';

import { Box, Stack, Avatar, Button, Typography } from "@mui/material";

import { safeTrim } from "src/utils/helper";

import { Iconify } from "src/components/iconify";

export default function AndroidMobilePreview({
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
        maxWidth: 360,
        bgcolor: '#fff',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        {/* Header with icon and app name */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
          <Avatar
            src={safeTrim(iconUrl) || ''}
            sx={{
              width: 24,
              height: 24,
              bgcolor: '#f5f5f5',
            }}
          >
            <Iconify icon="mdi:bell" width={14} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#000' }}>Your App</Typography>
            <Typography sx={{ fontSize: 10, color: '#757575' }}>now</Typography>
          </Box>
          <Iconify icon="mdi:chevron-down" width={16} sx={{ color: '#757575' }} />
        </Stack>

        {/* Title and body */}
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#000', mb: 0.5 }}>
          {title || 'Notification title preview'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#5f6368', lineHeight: 1.3 }}>
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
              height: 160,
              objectFit: 'cover',
              borderRadius: 1,
              mt: 1,
              bgcolor: '#f5f5f5',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Action Buttons - Improved Material Design Style */}
        {(hasCTA1 || hasCTA2) && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid #e0e0e0',
              justifyContent: 'flex-end',
            }}
          >
            {hasCTA1 && (
              <Button
                variant="text"
                size="small"
                sx={{
                  textTransform: 'uppercase',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1976d2',
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  borderRadius: 1,
                  letterSpacing: '0.5px',
                  '&:hover': {
                    bgcolor: '#e3f2fd',
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
                sx={{
                  textTransform: 'uppercase',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1976d2',
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  borderRadius: 1,
                  letterSpacing: '0.5px',
                  '&:hover': {
                    bgcolor: '#e3f2fd',
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
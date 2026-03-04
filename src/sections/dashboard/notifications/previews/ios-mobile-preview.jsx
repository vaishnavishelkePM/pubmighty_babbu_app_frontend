'use client';

import { Box, Stack, Avatar, Typography } from "@mui/material";

import { safeTrim } from "src/utils/helper";

import { Iconify } from "src/components/iconify";

export default 
function IOSMobilePreview({ title, body, iconUrl, imageUrl }) {
  const hasImage = !!safeTrim(imageUrl);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 360,
        bgcolor: 'rgba(242, 242, 247, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 2.5,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
          <Avatar
            src={safeTrim(iconUrl) || ''}
            sx={{
              width: 28,
              height: 28,
              bgcolor: '#fff',
              borderRadius: 1.5,
            }}
          >
            <Iconify icon="mdi:bell" width={16} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#000' }}>Your App</Typography>
            <Typography sx={{ fontSize: 12, color: '#666' }}>now</Typography>
          </Box>
        </Stack>

        {/* Content */}
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 600,
            color: '#000',
            mb: 0.5,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
          }}
        >
          {title || 'Notification title preview'}
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: '#666',
            lineHeight: 1.35,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
          }}
        >
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
              height: 140,
              objectFit: 'cover',
              borderRadius: 1.5,
              mt: 1,
              bgcolor: '#e5e5ea',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </Box>
    </Box>
  );
}
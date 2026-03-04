'use client';

import { useMemo, useState, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Dialog, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// Hook (state + actions)
export function useImageLightbox() {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [index, setIndex] = useState(0);

  const onClose = useCallback(() => setOpen(false), []);

  const onOpen = useCallback((items = [], startIndex = 0) => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) return;

    setImages(safeItems);
    setIndex(Math.max(0, Math.min(startIndex, safeItems.length - 1)));
    setOpen(true);
  }, []);

  const onNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % Math.max(1, images.length));
  }, [images.length]);

  const onPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + Math.max(1, images.length)) % Math.max(1, images.length));
  }, [images.length]);

  const props = useMemo(
    () => ({
      open,
      images,
      index,
      onClose,
      onNext,
      onPrev,
      setIndex,
    }),
    [open, images, index, onClose, onNext, onPrev]
  );

  return { open: onOpen, close: onClose, setIndex, props };
}

// Component (UI) - Square popup
export function ImageLightbox({ open, images, index, onClose, onNext, onPrev }) {
  const theme = useTheme();
  const total = images?.length || 0;
  const current = images?.[index] || '';

  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
        },
      }}
      BackdropProps={{
        sx: { bgcolor: 'rgba(0,0,0,0.75)' },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: -16,
            right: -16,
            zIndex: 10,
            color: 'common.white',
            bgcolor: alpha(theme.palette.grey[900], 0.7),
            '&:hover': { bgcolor: alpha(theme.palette.grey[900], 0.9) },
          }}
        >
          <Iconify icon="mdi:close" width={20} />
        </IconButton>

        {/* Square Frame */}
        <Box
          sx={{
            width: { xs: 320, sm: 420, md: 520 },
            maxWidth: '92vw',
            aspectRatio: '1 / 1',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            bgcolor: alpha(theme.palette.grey[900], 0.35),
            border: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {!!current && (
            <Box
              component="img"
              src={current}
              alt="Preview"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover', // square fill (cropped)
                display: 'block',
              }}
            />
          )}

          {/* Prev / Next */}
          {total > 1 && (
            <IconButton
              onClick={onPrev}
              sx={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'common.white',
                bgcolor: alpha(theme.palette.grey[900], 0.45),
                '&:hover': { bgcolor: alpha(theme.palette.grey[900], 0.75) },
              }}
            >
              <Iconify icon="mdi:chevron-left" width={32} />
            </IconButton>
          )}

          {total > 1 && (
            <IconButton
              onClick={onNext}
              sx={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'common.white',
                bgcolor: alpha(theme.palette.grey[900], 0.45),
                '&:hover': { bgcolor: alpha(theme.palette.grey[900], 0.75) },
              }}
            >
              <Iconify icon="mdi:chevron-right" width={32} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}

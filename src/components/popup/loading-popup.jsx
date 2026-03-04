import React from 'react';

import { Box, Dialog, Typography, CircularProgress } from '@mui/material';

const LoadingPopup = ({ open, message = 'Loading...' }) => (
    <Dialog open={open} PaperProps={{ sx: { p: 4, textAlign: 'center' } }}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <CircularProgress />
        <Typography variant="body1">{message}</Typography>
      </Box>
    </Dialog>
  );

export default LoadingPopup;

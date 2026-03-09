'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';

import {
  Box,
  Slide,
  Stack,
  Alert,
  Button,
  Dialog,
  Divider,
  TextField,
  AlertTitle,
  IconButton,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { getCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

export default function SetupEmailDialog({ open, onClose, onSuccess, adminEmail }) {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [verifyToken, setVerifyToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Send OTP when dialog opens
  useEffect(() => {
    if (open) {
      handleSetupEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSetupEmail = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/enable/twofa/email`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session_key}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      const result = res.data;

      if (!result?.success) {
        toast.error(result?.msg || 'Failed to setup email 2FA');
        onClose();
      }
    } catch (err) {
      console.error('handleSetupEmail error:', err);
      toast.error('Error setting up email 2FA');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyToken?.trim() || verifyToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/verify/twofa/email`,
        { otp: verifyToken },
        {
          headers: {
            Authorization: `Bearer ${session_key}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      const result = res.data;

      if (result?.success) {
        toast.success(result?.msg || 'Email 2FA enabled successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(result?.msg || 'Invalid OTP');
      }
    } catch (err) {
      console.error('handleVerify error:', err);
      toast.error('Error verifying email 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setVerifyToken('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
    >
      <DialogTitle
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'info.lighter',
              color: 'info.main',
            }}
          >
            <Iconify icon="mdi:email-lock" width={24} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Setup Email 2FA</Typography>
            <Typography variant="caption" color="text.secondary">
              Verify with code sent to your email
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={handleClose}>
          <Iconify icon="mdi:close" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, bgcolor: 'background.neutral' }}>
        <Stack spacing={2.5}>
          <Alert severity="info" variant="soft">
            <AlertTitle>Verification Code Sent</AlertTitle>A 6-digit code has been sent to{' '}
            <strong>{adminEmail}</strong>. Please enter it below to enable email 2FA.
          </Alert>

          <TextField
            fullWidth
            label="Verification Code"
            placeholder="000000"
            value={verifyToken}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 6) setVerifyToken(val);
            }}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 20 } }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button color="inherit" variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleVerify}
          disabled={verifyToken.length !== 6 || isLoading}
          startIcon={<Iconify icon="mdi:shield-check" />}
        >
          Verify & Enable
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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

export default function Disable2FADialog({ open, onClose, onSuccess, twoFAMethod }) {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [disableToken, setDisableToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Send disable request when dialog opens
  useEffect(() => {
    if (open) {
      handleDisableRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDisableRequest = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/disable/twofa/email`,
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
        toast.error(result?.msg || 'Failed to initiate 2FA disable');
        onClose();
      }
    } catch (err) {
      console.error('handleDisableRequest error:', err);
      toast.error('Error disabling 2FA');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!disableToken?.trim() || disableToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/disable/twofa/email`,
        { otp: disableToken },
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
        toast.success(result?.msg || '2FA disabled successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(result?.msg || 'Invalid OTP');
      }
    } catch (err) {
      console.error('handleVerify error:', err);
      toast.error('Error disabling 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDisableToken('');
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
              bgcolor: 'error.lighter',
              color: 'error.main',
            }}
          >
            <Iconify icon="mdi:shield-off" width={24} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Disable 2FA</Typography>
            <Typography variant="caption" color="text.secondary">
              Verify to disable two-factor authentication
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
          <Alert severity="warning" variant="soft">
            <AlertTitle>Security Warning</AlertTitle>
            Disabling 2FA will make your account less secure. Enter the verification code from your{' '}
            {twoFAMethod === 'auth_app' ? 'authenticator app' : 'email'} to proceed.
          </Alert>

          <TextField
            fullWidth
            label="Verification Code"
            placeholder="000000"
            value={disableToken}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 6) setDisableToken(val);
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
          color="error"
          onClick={handleVerify}
          disabled={disableToken.length !== 6 || isLoading}
          startIcon={<Iconify icon="mdi:shield-off" />}
        >
          Disable 2FA
        </Button>
      </DialogActions>
    </Dialog>
  );
}

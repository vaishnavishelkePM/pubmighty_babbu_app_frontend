'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';

import {
  Box,
  Slide,
  Stack,
  Paper,
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
  CircularProgress,
} from '@mui/material';

import { getCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

export default function SetupAuthAppDialog({ open, onClose, onSuccess }) {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQR, setIsFetchingQR] = useState(false);

  // Fetch QR code when dialog opens
  useEffect(() => {
    if (open) {
      handleSetupAuthApp();
    } else {
      // Reset state when dialog closes
      setQrCode('');
      setSecret('');
      setVerifyToken('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSetupAuthApp = async () => {
    setIsFetchingQR(true);
    try {
      const res = await axios.post(
        `${baseUrl}/enable/twofa/app`,
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

      if (result?.success) {
        setQrCode(result.data.qr);
        setSecret(result.data.secret);
      } else {
        toast.error(result?.msg || 'Failed to setup 2FA');
        onClose();
      }
    } catch (err) {
      console.error('handleSetupAuthApp error:', err);
      toast.error('Error setting up 2FA');
      onClose();
    } finally {
      setIsFetchingQR(false);
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
        `${baseUrl}/verify/twofa/app`,
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
        toast.success(result?.msg || '2FA enabled successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(result?.msg || 'Invalid OTP');
      }
    } catch (err) {
      console.error('handleVerify error:', err);
      toast.error('Error verifying 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setVerifyToken('');
    setQrCode('');
    setSecret('');
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
              bgcolor: 'primary.lighter',
              color: 'primary.main',
            }}
          >
            <Iconify icon="mdi:cellphone-key" width={24} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Setup Authenticator App</Typography>
            <Typography variant="caption" color="text.secondary">
              Scan QR code with your authenticator app
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
          {isFetchingQR ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                minHeight: 200,
              }}
            >
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Generating QR code...
              </Typography>
            </Paper>
          ) : (
            <>
              <Alert severity="info" variant="soft">
                <AlertTitle>Step 1: Scan QR Code</AlertTitle>
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR
                code.
              </Alert>

              {qrCode && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                  }}
                >
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </Paper>
              )}

              {secret && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    Or enter this code manually:
                  </Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 14,
                        fontWeight: 600,
                        wordBreak: 'break-all',
                      }}
                    >
                      {secret}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(secret);
                        toast.success('Secret copied to clipboard');
                      }}
                    >
                      <Iconify icon="mdi:content-copy" />
                    </IconButton>
                  </Stack>
                </Paper>
              )}

              <Alert severity="warning" variant="soft">
                <AlertTitle>Step 2: Enter Verification Code</AlertTitle>
                Enter the 6-digit code from your authenticator app to complete setup.
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
                disabled={isFetchingQR}
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button color="inherit" variant="outlined" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleVerify}
          disabled={verifyToken.length !== 6 || isLoading || isFetchingQR}
          startIcon={<Iconify icon="mdi:shield-check" />}
        >
          Verify & Enable
        </Button>
      </DialogActions>
    </Dialog>
  );
}

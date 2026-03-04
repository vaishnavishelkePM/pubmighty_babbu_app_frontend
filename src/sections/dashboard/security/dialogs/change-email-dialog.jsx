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
  InputAdornment,
} from '@mui/material';

import { getCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

export default function ChangeEmailDialog({ open, onClose, onSuccess, currentEmail }) {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [emailForm, setEmailForm] = useState({
    old_email: '',
    new_email: '',
    old_email_otp: '',
    new_email_otp: '',
  });
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && currentEmail) {
      setEmailForm((p) => ({ ...p, old_email: currentEmail }));
    }
  }, [open, currentEmail]);

  const handleRequest = async () => {
    if (!emailForm.old_email?.trim() || !emailForm.new_email?.trim()) {
      toast.error('Both old and new email are required');
      return;
    }

    if (emailForm.old_email === emailForm.new_email) {
      toast.error('New email must be different from old email');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/change/email/request`,
        {
          old_email: emailForm.old_email,
          new_email: emailForm.new_email,
        },
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
        toast.success(result?.msg || 'OTPs sent to both emails');
        setStep('verify');
      } else {
        toast.error(result?.msg || 'Failed to send OTPs');
      }
    } catch (err) {
      console.error('handleRequest error:', err);
      toast.error('Error requesting email change');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!emailForm.old_email_otp?.trim() || !emailForm.new_email_otp?.trim()) {
      toast.error('Both OTPs are required');
      return;
    }

    if (emailForm.old_email_otp.length !== 6 || emailForm.new_email_otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTPs');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/change/email/verify`,
        {
          old_email_otp: emailForm.old_email_otp,
          new_email_otp: emailForm.new_email_otp,
        },
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
        toast.success(result?.msg || 'Email changed successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(result?.msg || 'Invalid OTPs');
      }
    } catch (err) {
      console.error('handleVerify error:', err);
      toast.error('Error verifying email change');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmailForm({
      old_email: '',
      new_email: '',
      old_email_otp: '',
      new_email_otp: '',
    });
    setStep('request');
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
              bgcolor: 'warning.lighter',
              color: 'warning.main',
            }}
          >
            <Iconify icon="mdi:email-edit" width={24} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Change Email Address</Typography>
            <Typography variant="caption" color="text.secondary">
              {step === 'request' ? 'Enter email addresses' : 'Verify with OTP codes'}
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
          {step === 'request' ? (
            <>
              <Alert severity="info" variant="soft">
                You&apos;ll receive verification codes on both your current and new email addresses.
              </Alert>

              <TextField
                fullWidth
                type="email"
                label="Current Email"
                value={emailForm.old_email}
                onChange={(e) => setEmailForm((p) => ({ ...p, old_email: e.target.value }))}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="mdi:email" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type="email"
                label="New Email *"
                placeholder="new.email@example.com"
                value={emailForm.new_email}
                onChange={(e) => setEmailForm((p) => ({ ...p, new_email: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="mdi:email-plus" />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          ) : (
            <>
              <Alert severity="success" variant="soft">
                <AlertTitle>Verification Codes Sent</AlertTitle>
                Check both your current email (<strong>{emailForm.old_email}</strong>) and new email
                (<strong>{emailForm.new_email}</strong>) for verification codes.
              </Alert>

              <TextField
                fullWidth
                label="Code from Current Email"
                placeholder="000000"
                value={emailForm.old_email_otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setEmailForm((p) => ({ ...p, old_email_otp: val }));
                }}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 18 } }}
              />

              <TextField
                fullWidth
                label="Code from New Email"
                placeholder="000000"
                value={emailForm.new_email_otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setEmailForm((p) => ({ ...p, new_email_otp: val }));
                }}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 18 } }}
              />

              <Button
                variant="text"
                size="small"
                onClick={() => setStep('request')}
                startIcon={<Iconify icon="mdi:arrow-left" />}
              >
                Back to Email Entry
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button color="inherit" variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        {step === 'request' ? (
          <Button
            variant="contained"
            onClick={handleRequest}
            disabled={!emailForm.old_email || !emailForm.new_email || isLoading}
            startIcon={<Iconify icon="mdi:email-send" />}
          >
            Send Verification Codes
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={
              emailForm.old_email_otp.length !== 6 ||
              emailForm.new_email_otp.length !== 6 ||
              isLoading
            }
            startIcon={<Iconify icon="mdi:check-circle" />}
          >
            Verify & Change Email
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

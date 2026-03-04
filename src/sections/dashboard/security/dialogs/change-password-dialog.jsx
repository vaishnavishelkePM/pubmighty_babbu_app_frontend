'use client';

import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';

import {
  Box,
  Slide,
  Stack,
  Alert,
  Button,
  Dialog,
  Divider,
  TextField,
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

export default function ChangePasswordDialog({ open, onClose, onSuccess }) {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (
      !passwordForm.current_password?.trim() ||
      !passwordForm.new_password?.trim() ||
      !passwordForm.confirm_password?.trim()
    ) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      toast.error('New password must be different from current password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}/update/password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          confirm_password: passwordForm.confirm_password,
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
        toast.success(result?.msg || 'Password updated successfully');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(result?.msg || 'Failed to update password');
      }
    } catch (err) {
      console.error('handleSubmit error:', err);
      toast.error('Error updating password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setShowPasswords({ current: false, new: false, confirm: false });
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
              bgcolor: 'success.lighter',
              color: 'success.main',
            }}
          >
            <Iconify icon="mdi:lock-reset" width={24} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Change Password</Typography>
            <Typography variant="caption" color="text.secondary">
              Update your account password
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
            Password must be at least 8 characters long and different from your current password.
          </Alert>

          <TextField
            fullWidth
            type={showPasswords.current ? 'text' : 'password'}
            label="Current Password *"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mdi:lock" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                    edge="end"
                  >
                    <Iconify icon={showPasswords.current ? 'mdi:eye-off' : 'mdi:eye'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            type={showPasswords.new ? 'text' : 'password'}
            label="New Password *"
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
            error={passwordForm.new_password.length > 0 && passwordForm.new_password.length < 8}
            helperText={
              passwordForm.new_password.length > 0 && passwordForm.new_password.length < 8
                ? 'Password must be at least 8 characters'
                : ' '
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mdi:lock-plus" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                    edge="end"
                  >
                    <Iconify icon={showPasswords.new ? 'mdi:eye-off' : 'mdi:eye'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            type={showPasswords.confirm ? 'text' : 'password'}
            label="Confirm New Password *"
            value={passwordForm.confirm_password}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
            error={
              passwordForm.confirm_password.length > 0 &&
              passwordForm.new_password !== passwordForm.confirm_password
            }
            helperText={
              passwordForm.confirm_password.length > 0 &&
              passwordForm.new_password !== passwordForm.confirm_password
                ? 'Passwords do not match'
                : ' '
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mdi:lock-check" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                    edge="end"
                  >
                    <Iconify icon={showPasswords.confirm ? 'mdi:eye-off' : 'mdi:eye'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button color="inherit" variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            !passwordForm.current_password ||
            !passwordForm.new_password ||
            !passwordForm.confirm_password ||
            passwordForm.new_password !== passwordForm.confirm_password ||
            passwordForm.new_password.length < 8 ||
            isLoading
          }
          startIcon={<Iconify icon="mdi:content-save" />}
        >
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

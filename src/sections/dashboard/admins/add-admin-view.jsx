'use client';

import { z } from 'zod';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Grid,
  Stack,
  Slide,
  Button,
  Select,
  Avatar,
  Dialog,
  Divider,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  IconButton,
  FormControl,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { SectionHeader } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const Schema = z.object({
  username: z.string().trim().min(3, 'Username is required').max(50),
  email: z.string().trim().email('Valid email required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role: z.enum(['superAdmin', 'staff', 'paymentManager', 'support']),
  status: z.number().int().min(0).max(3).default(1),
  twoFactorEnabled: z.number().int().min(0).max(2).default(0),
  avatar: z.any().optional().nullable(),
});

export default function AddAdminView({ open, onClose, onCreated }) {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'staff',
      status: 1,
      twoFactorEnabled: 0,
      avatar: null,
    },
  });

  const avatarFile = watch('avatar');

  useEffect(() => {
    if (avatarFile instanceof File) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
  }, [avatarFile]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = async (values) => {
    const token = getCookie('session_key') || window.localStorage.getItem('session_key');
    if (!token) {
      toast.error('Session expired.');
      router.push(paths.auth.login);
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      Object.keys(values).forEach((key) => {
        if (values[key] !== null && values[key] !== undefined) {
          fd.append(key, values[key]);
        }
      });

      const res = await axios.post(`${CONFIG.apiUrl}/v1/admin/manage-admins/add`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Admin created successfully');
        onCreated?.(res.data.data);
        onClose();
      } else {
        toast.error(res.data.msg || 'Error creating admin');
      }
    } catch (e) {
      toast.error('Server error');
    } finally {
      setLoading(false);
    }
  };

  const isLight = theme.palette.mode === 'light';

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Add Administrator
        </Typography>
        <IconButton onClick={onClose} disabled={loading} size="small">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Grid container>
          {/* Fixed Sidebar - Adjusted for Visibility */}
          <Grid
            item
            xs={12}
            md={4}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              // Use a solid light grey for light mode to ensure contrast
              bgcolor: isLight ? theme.palette.grey[100] : alpha(theme.palette.common.black, 0.4),
              borderRight: { md: `1px solid ${theme.palette.divider}` },
            }}
          >
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Avatar
                src={avatarPreview}
                sx={{
                  width: 128,
                  height: 128,
                  mx: 'auto',
                  border: `2px solid ${theme.palette.primary.main}`,
                  padding: '4px',
                  bgcolor: 'background.paper', // Ensures the gap is visible
                  boxShadow: theme.customShadows?.z12,
                }}
              >
                {!avatarPreview && (
                  <Iconify icon="solar:user-bold" width={64} sx={{ color: 'text.disabled' }} />
                )}
              </Avatar>
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: theme.customShadows?.z8,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <Iconify icon="solar:camera-add-bold" width={20} />
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setValue('avatar', e.target.files[0])}
                />
              </IconButton>
            </Box>

            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Profile Image
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, px: 1 }}>
              Recommended: Square JPG/PNG <br /> (Min: 400x400px)
            </Typography>

            {avatarPreview && (
              <Button
                color="error"
                size="small"
                variant="soft"
                startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
                onClick={() => setValue('avatar', null)}
                sx={{ mt: 2 }}
              >
                Remove
              </Button>
            )}
          </Grid>

          {/* Form Area */}
          <Grid item xs={12} md={8} sx={{ p: 4, bgcolor: 'background.paper' }}>
            <Stack spacing={4}>
              <Box>
                <SectionHeader
                  icon="solar:user-id-bold-duotone"
                  title="Account Identity"
                  description="Basic info and unique credentials"
                />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Username"
                          error={!!errors.username}
                          helperText={errors.username?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="first_name"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="First Name" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="last_name"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="Last Name" />}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          error={!!errors.email}
                          helperText={errors.email?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="password"
                          label="Initial Password"
                          error={!!errors.password}
                          helperText={errors.password?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
                <SectionHeader
                  icon="solar:shield-check-bold-duotone"
                  title="Role & Safety"
                  description="Permissions and 2FA settings"
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Access Role</InputLabel>
                      <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                          <Select {...field} label="Access Role">
                            <MenuItem value="superAdmin">Super Admin</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                            <MenuItem value="paymentManager">Payment Manager</MenuItem>
                            <MenuItem value="support">Support</MenuItem>
                          </Select>
                        )}
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>2FA Security</InputLabel>
                      <Controller
                        name="twoFactorEnabled"
                        control={control}
                        render={({ field }) => (
                          <Select {...field} label="2FA Security">
                            <MenuItem value={0}>None</MenuItem>
                            <MenuItem value={1}>App</MenuItem>
                            <MenuItem value={2}>Email</MenuItem>
                          </Select>
                        )}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          loading={loading}
          sx={{ px: 4, py: 1, borderRadius: 1.5, boxShadow: theme.customShadows?.primary }}
        >
          Create Admin
        </Button>
      </DialogActions>
    </Dialog>
  );
}

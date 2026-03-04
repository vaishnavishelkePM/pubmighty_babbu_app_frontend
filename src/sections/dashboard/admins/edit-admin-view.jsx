'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Grid,
  Stack,
  Slide,
  Avatar,
  Button,
  Select,
  Dialog,
  Divider,
  MenuItem,
  TextField,
  InputLabel,
  IconButton,
  Typography,
  FormControl,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

import {  SectionHeader } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { useAppContext } from 'src/contexts/app-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------


export default function EditAdminView({ open, adminId, onClose, onUpdated }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const { user, setUser } = useAppContext();

  // ----------------------- Fetch Logic -----------------------
  useEffect(() => {
    const fetchAdmin = async () => {
      if (!open || !adminId) return;
      const token = getCookie('session_key') || window.localStorage.getItem('session_key');

      try {
        setLoading(true);
        const url = `${CONFIG.apiUrl}/v1/admin/manage-admins/${adminId}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data?.success) setAdmin(res.data.data);
      } catch (e) {
        toast.error('Failed to load admin data');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, [open, adminId, onClose]);

  const editDefaults = useMemo(
    () => ({
      username: admin?.username || '',
      email: admin?.email || '',
      password: '',
      first_name: admin?.first_name || '',
      last_name: admin?.last_name || '',
      role: admin?.role || 'staff',
      status: Number.isFinite(Number(admin?.status)) ? Number(admin?.status) : 1,

      twoFactorEnabled: Number.isFinite(Number(admin?.twoFactorEnabled ?? admin?.two_fa))
        ? Number(admin?.twoFactorEnabled ?? admin?.two_fa)
        : 0,
      avatar: null,
    }),
    [admin]
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm({
    defaultValues: editDefaults,
  });

  useEffect(() => {
    if (open && admin) reset(editDefaults);
  }, [open, admin, editDefaults, reset]);

  const avatarFile = watch('avatar');
  useEffect(() => {
    if (avatarFile instanceof File) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
  }, [avatarFile]);

  const avatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (!admin?.avatar) return '';
    return `${CONFIG.assetsUrl}/uploads/avatar/admin/${admin.avatar}?v=${admin.updatedAt || Date.now()}`;
  };

  // ----------------------- Submit Logic -----------------------
  const onSave = async (values) => {
    const token = getCookie('session_key') || window.localStorage.getItem('session_key');
    try {
      setSaving(true);
      const fd = new FormData();
      Object.keys(values).forEach((key) => {
        if (values[key] !== null && values[key] !== undefined && key !== 'avatar') {
          fd.append(key, values[key]);
        }
      });
      if (values.avatar instanceof File) fd.append('avatar', values.avatar);

      const url = `${CONFIG.apiUrl}/v1/admin/manage-admins/${adminId}`;
      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success('Admin updated successfully');

        const updatedAdmin = res.data.data;

        // . If this edited admin is the currently logged-in admin
        if (String(updatedAdmin?.id) === String(user?.id)) {
          setUser(updatedAdmin); // . updates dashboard/header instantly
        }

        onUpdated?.(updatedAdmin);
        onClose();
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
      PaperProps={{
        sx: { borderRadius: 2, bgcolor: 'background.paper', backgroundImage: 'none' },
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
          Edit Administrator{' '}
          {admin && (
            <Typography component="span" variant="subtitle2" color="text.disabled">
              #{admin.id}
            </Typography>
          )}
        </Typography>
        <IconButton onClick={onClose} disabled={saving} size="small">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Loading account data...
            </Typography>
          </Stack>
        ) : (
          <Grid container>
            {/* Sidebar Section */}
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
                bgcolor: isLight ? theme.palette.grey[100] : alpha(theme.palette.common.black, 0.4),
                borderRight: { md: `1px solid ${theme.palette.divider}` },
              }}
            >
              <Box sx={{ position: 'relative', mb: 3 }}>
                <Avatar
                  src={avatarSrc()}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    border: `2px solid ${theme.palette.primary.main}`,
                    padding: '4px',
                    bgcolor: 'background.paper',
                    boxShadow: theme.customShadows?.z12,
                  }}
                >
                  {!avatarSrc() && (
                    <Iconify icon="solar:user-bold" width={60} sx={{ color: 'text.disabled' }} />
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
                  <Iconify icon="solar:camera-add-bold" width={18} />
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => setValue('avatar', e.target.files[0], { shouldDirty: true })}
                  />
                </IconButton>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Profile Picture
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, px: 2 }}>
                Allowed *.jpeg, *.jpg, *.png <br /> Max size 2MB
              </Typography>

              {avatarPreview && (
                <Button
                  color="error"
                  size="small"
                  variant="soft"
                  sx={{ mt: 2 }}
                  onClick={() => setValue('avatar', null)}
                >
                  Cancel Upload
                </Button>
              )}
            </Grid>

            {/* Form Section */}
            <Grid item xs={12} md={8} sx={{ p: 4 }}>
              <Stack spacing={4}>
                <Box>
                  <SectionHeader
                    icon="solar:user-id-bold-duotone"
                    title="Account Details"
                    description="Update name and system credentials"
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} fullWidth label="Username" disabled={saving} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="first_name"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} fullWidth label="First Name" disabled={saving} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="last_name"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} fullWidth label="Last Name" disabled={saving} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="email"
                        control={control}
                        disabled
                        render={({ field }) => (
                          <TextField {...field} fullWidth label="Email Address" disabled />
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
                    description="Permissions and security settings"
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Controller
                          name="role"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Role">
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
                        <InputLabel>Status</InputLabel>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Status">
                              <MenuItem value={1}>Active</MenuItem>
                              <MenuItem value={2}>Suspended</MenuItem>
                              <MenuItem value={3}>Disabled</MenuItem>
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
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={handleSubmit(onSave)}
          loading={saving}
          disabled={!isDirty || saving}
          sx={{ px: 4, boxShadow: theme.customShadows?.primary }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

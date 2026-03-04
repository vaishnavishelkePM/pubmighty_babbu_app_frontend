'use client';

import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';

import {
  Box,
  Card,
  Grid,
  Stack,
  Alert,
  Button,
  Avatar,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { getCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAppContext } from 'src/contexts/app-context';

import { Iconify } from 'src/components/iconify';
import LoadingPopup from 'src/components/popup/loading-popup';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import SectionHeader from 'src/components/my-components/section-header';

import Disable2FADialog from './dialogs/disable-2fa-dialog';
import SetupEmailDialog from './dialogs/setup-email-dialog';
import ChangeEmailDialog from './dialogs/change-email-dialog';
import SetupAuthAppDialog from './dialogs/setup-auth-app-dialog';
import ChangePasswordDialog from './dialogs/change-password-dialog';

export default function SecurityView() {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;
  const { user, setUser } = useAppContext();

  const [actionLoading, setActionLoading] = useState(false);

  const [openSetupAuthApp, setOpenSetupAuthApp] = useState(false);
  const [openSetupEmail, setOpenSetupEmail] = useState(false);
  const [openDisable2FA, setOpenDisable2FA] = useState(false);
  const [openChangeEmail, setOpenChangeEmail] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);

  const refreshUserData = async () => {
    try {
      const res = await axios.get(`${baseUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${session_key}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      });

      const result = res.data;

      if (result?.success) setUser(result.data);
      else toast.error(result?.msg || 'Failed to refresh user data');
    } catch (err) {
      console.error('refreshUserData error:', err);
      toast.error('Error refreshing user data');
    }
  };

 
  const methodTileSx = {
    p: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    bgcolor: 'background.paper',
    color: 'text.primary',
    '&:hover': {
      transform: 'translateY(-2px)',
      // Works in both light & dark
      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
      borderColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.20)' : t.palette.primary.main,
      boxShadow: (t) => t.customShadows?.z8 || t.shadows[6],
    },
    '&:active': { transform: 'translateY(-1px)' },
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Security Settings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Profile', href: paths.dashboard.profile },
          { name: 'Security' },
        ]}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        {/* 2FA SECTION */}
        <Grid item xs={12}>
          <Card sx={{ p: 1 }}>
            <Box sx={{ p: 3 }}>
              <SectionHeader
                icon="solar:shield-check-bold"
                title="Security Center"
                sx={{ mb: 3 }}
              />

              <Grid container spacing={3}>
                {/* Status Panel */}
                <Grid item xs={12} md={5}>
                  <Box
                    sx={{
                      height: '100%',
                      p: 3,
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: (t) =>
                        user?.two_fa
                          ? `linear-gradient(135deg, ${t.palette.success.main} 0%, ${t.palette.success.dark} 100%)`
                          : `linear-gradient(135deg, ${t.palette.warning.main} 0%, ${t.palette.warning.dark} 100%)`,
                      color: 'common.white',
                    }}
                  >
                    <Iconify
                      icon={user?.two_fa ? 'solar:shield-check-bold' : 'solar:shield-warning-bold'}
                      sx={{
                        position: 'absolute',
                        right: -20,
                        bottom: -20,
                        width: 160,
                        height: 160,
                        opacity: 0.12,
                      }}
                    />

                    <Stack spacing={1} sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {user?.two_fa ? 'Protected' : 'At Risk'}
                      </Typography>

                      <Typography variant="body2" sx={{ opacity: 0.8, maxWidth: 240 }}>
                        {user?.two_fa
                          ? `Your account is secured via ${
                              user?.two_fa_method === 'auth_app' ? 'Authenticator App' : 'Email'
                            }.`
                          : 'Your account is vulnerable. Enable 2FA now.'}
                      </Typography>

                      {user?.two_fa && (
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => setOpenDisable2FA(true)}
                          sx={{
                            mt: 2,
                            borderColor: 'rgba(255,255,255,0.3)',
                            '&:hover': {
                              borderColor: 'common.white',
                              bgcolor: 'rgba(255,255,255,0.1)',
                            },
                          }}
                        >
                          Manage Settings
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Grid>

                {/* Action Panel */}
                <Grid item xs={12} md={7}>
                  {!user?.two_fa ? (
                    <Stack spacing={2} justifyContent="center" sx={{ height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Choose Protection Method
                      </Typography>

                      {/* Auth App Tile */}
                      <Box onClick={() => setOpenSetupAuthApp(true)} sx={methodTileSx}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'common.white',
                              flexShrink: 0,
                            }}
                          >
                            <Iconify icon="solar:smartphone-2-bold" />
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              Authenticator App
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: 'text.secondary',
                                // ' keep readable in dark hover
                                opacity: 0.9,
                              }}
                            >
                              Most Secure • Google Auth, Authy, etc.
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* Email Tile */}
                      <Box onClick={() => setOpenSetupEmail(true)} sx={methodTileSx}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: 'info.main',
                              color: 'common.white',
                              flexShrink: 0,
                            }}
                          >
                            <Iconify icon="solar:letter-bold" />
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              Email Verification
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: 'text.secondary',
                                opacity: 0.9,
                              }}
                            >
                              Convenient • Codes sent to your inbox
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Stack>
                  ) : (
                    <Stack spacing={2} justifyContent="center" sx={{ height: '100%' }}>
                      <Alert
                        severity="success"
                        variant="soft"
                        icon={<Iconify icon="solar:verified-check-bold" />}
                      >
                        Security is up to date! Your account meets all recommended security
                        requirements.
                      </Alert>

                      <Typography variant="caption" color="text.disabled">
                        Last security audit: {new Date().toLocaleDateString()}
                      </Typography>
                    </Stack>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>

        {/* EMAIL CARD */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%', position: 'relative', transition: 'all 0.3s' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                  display: 'flex',
                }}
              >
                <Iconify icon="solar:letter-bold-duotone" width={28} />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>
                  Email Address
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Your primary contact method
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: 'background.neutral',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Current Email
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {user?.email}
                </Typography>
              </Stack>

              <Tooltip title="Change Email">
                <IconButton
                  onClick={() => setOpenChangeEmail(true)}
                  sx={{
                    bgcolor: 'background.paper',
                    boxShadow: (t) => t.customShadows.z8,
                    '&:hover': { bgcolor: 'primary.main', color: 'common.white' },
                  }}
                >
                  <Iconify icon="solar:pen-new-square-bold" width={20} />
                </IconButton>
              </Tooltip>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 2, color: 'info.main' }}
            >
              <Iconify icon="solar:info-circle-bold-duotone" width={18} />
              <Typography variant="caption">Verification required for changes</Typography>
            </Stack>
          </Card>
        </Grid>

        {/* PASSWORD CARD */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'warning.lighter',
                    color: 'warning.main',
                    display: 'flex',
                  }}
                >
                  <Iconify icon="solar:lock-password-bold-duotone" width={28} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ lineHeight: 1 }}>
                    Password
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Last changed: 3 months ago
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Change your password regularly to keep your account secure and prevent unauthorized
                access.
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="soft"
              color="warning"
              size="large"
              startIcon={<Iconify icon="solar:key-bold" />}
              onClick={() => setOpenChangePassword(true)}
              sx={{
                py: 1.8,
                borderRadius: 2,
                fontWeight: 700,
                border: '1px dashed',
                borderColor: 'warning.main',
              }}
            >
              Update Credentials
            </Button>
          </Card>
        </Grid>
      </Grid>

      {/* DIALOGS */}
      <SetupAuthAppDialog
        open={openSetupAuthApp}
        onClose={() => setOpenSetupAuthApp(false)}
        onSuccess={refreshUserData}
      />

      <SetupEmailDialog
        open={openSetupEmail}
        onClose={() => setOpenSetupEmail(false)}
        onSuccess={refreshUserData}
        adminEmail={user?.email}
      />

      <Disable2FADialog
        open={openDisable2FA}
        onClose={() => setOpenDisable2FA(false)}
        onSuccess={refreshUserData}
        twoFAMethod={user?.two_fa_method}
      />

      <ChangeEmailDialog
        open={openChangeEmail}
        onClose={() => setOpenChangeEmail(false)}
        onSuccess={refreshUserData}
        currentEmail={user?.email}
      />

      <ChangePasswordDialog
        open={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
        onSuccess={refreshUserData}
      />

      <LoadingPopup open={actionLoading} message="Processing..." />
    </DashboardContent>
  );
}






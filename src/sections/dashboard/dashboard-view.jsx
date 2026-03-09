'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';

import { paths } from 'src/routes/paths';

import { formatNumber } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function DashboardView() {
  const [stats, setStats] = useState({
    users: {
      total_users: 0,
      total_bots: 0,
      total_real_users: 0,
    },
    reports: {
      total_reports: 0,
      pending_reports: 0,
      resolved_reports: 0,
    },
    // new
    master_prompts: {
      total_active_master_prompts: 0,
    },
    coin_packages: {
      total_active_coin_packages: 0,
    },
  });

  const [isCardsLoading, setIsCardsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = getCookie('session_key');

      setIsCardsLoading(true);

      // 1) existing dashboard stats
      const statsRes = await axios.get(`${CONFIG.apiUrl}/v1/admin/stats`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (!statsRes?.data?.success) {
        toast.error(statsRes?.data?.message || 'Failed to fetch dashboard stats');
        return;
      }

      const baseStats = statsRes.data.data || {};

      // 2) master prompts total (SEQUENTIAL)
      const promptsRes = await axios.get(`${CONFIG.apiUrl}/v1/admin/master-prompts/total`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (!promptsRes?.data?.success) {
        toast.error(promptsRes?.data?.message || 'Failed to fetch master prompts total');
        // still show baseStats
      }

      // 3) coin packages total (SEQUENTIAL)
      const packagesRes = await axios.get(`${CONFIG.apiUrl}/v1/admin/coin-packages/total`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (!packagesRes?.data?.success) {
        toast.error(packagesRes?.data?.message || 'Failed to fetch coin packages total');
        // still show baseStats
      }

      // merge all into one state
      setStats({
        ...baseStats,
        master_prompts: promptsRes?.data?.data || { total_active_master_prompts: 0 },
        coin_packages: packagesRes?.data?.data || { total_active_coin_packages: 0 },
      });
    } catch (error) {
      console.error('Error during fetchStats:', error);
      toast.error('Something went wrong while fetching dashboard stats');
    } finally {
      setIsCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const uiCards = useMemo(
    () => [
      {
        title: 'Total Users',
        value: stats?.users?.total_real_users ?? 0,
        icon: 'mdi:account-check-outline',
        color: '#16a34a',
      },
      {
        title: 'Total Bots',
        value: stats?.users?.total_bots ?? 0,
        icon: 'mdi:robot',
        color: '#2563eb',
      },
      {
        title: 'Total Reports',
        value: stats?.reports?.total_reports ?? 0,
        icon: 'mdi:alert-circle-outline',
        color: '#dc2626',
      },
      {
        title: 'Pending Reports',
        value: stats?.reports?.pending_reports ?? 0,
        icon: 'mdi:clipboard-alert-outline',
        color: '#f59e0b',
      },
      {
        title: 'Completed Reports',
        value: stats?.reports?.resolved_reports ?? 0,
        icon: 'mdi:check-circle-outline',
        color: '#0ea5e9',
      },

      {
        title: 'Total Prompts',
        value: stats?.master_prompts?.total_active_master_prompts ?? 0,
        icon: 'mdi:message-text-outline',
        color: '#7c3aed',
      },


      {
        title: 'Total Packages',
        value: stats?.coin_packages?.total_active_coin_packages ?? 0,
        icon: 'mdi:wallet-outline',
        color: '#14b8a6',
      },
    ],
    [stats]
  );

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CustomBreadcrumbs
          heading="Dashboard"
          links={[
            { name: 'Home', href: paths.root },
            { name: 'Dashboard', href: paths.dashboard.root },
          ]}
          sx={{ mb: 1 }}
        />
      </Box>

      <Grid container spacing={2}>
        {uiCards.map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              sx={{
                display: { md: 'flex' },
                flexDirection: { md: 'column', xs: 'row' },
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                p: 2,
                mt: 2,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ typography: 'subtitle2', width: '100%' }}>{card.title}</Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: '16px',
                  width: '100%',
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ mt: 1.5, mb: 1, typography: 'h3' }}>
                    {isCardsLoading ? (
                      <Skeleton variant="text" width={90} height={36} sx={{ mt: 0.5 }} />
                    ) : (
                      formatNumber(card.value)
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    backgroundColor: card.color,
                    color: '#fff',
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={card.icon} width={26} height={26} />
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </DashboardContent>
  );
}

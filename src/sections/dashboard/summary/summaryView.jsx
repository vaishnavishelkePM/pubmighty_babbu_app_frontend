'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Title,
  Legend,
  Filler,
  Tooltip,
  BarElement,
  ArcElement,
  LinearScale,
  LineElement,
  PointElement,
  CategoryScale,
  Chart as ChartJS,
} from 'chart.js';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Tab, Card, Tabs, Stack, Typography, useMediaQuery } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  KpiCard,
  safeJoin,
  EmptyState,
  DateFilters,
  formatNumber,
  ChartSkeleton,
  getCountryName,
  getSessionToken,

  formatCurrencyCompactINR,
} from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import TableSkeleton from 'src/components/skeletons/table-skeleton';

import AnalyticsAdsTab from './graph-components/ads-view';
import AnalyticsUsersTab from './graph-components/user-view';
import AnalyticsRevenueTab from './graph-components/revenue-view';
import AnalyticsCoinSpendTab from './graph-components/coin-spent-view';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsView() {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [adsData, setAdsData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(30);
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [newUsersData, setNewUsersData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [coinSpendData, setCoinSpendData] = useState(null);

  const getDefaultDates = useCallback((days = 30) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from, to };
  }, []);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: getDefaultDates(30),
  });

  const apiGet = useCallback(
    async (endpoint, from, to, additionalParams = {}) => {
      const token = getSessionToken();
      if (!token) {
        toast.error('Session expired. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return null;
      }

      const params = new URLSearchParams();
      if (from) params.set('from', from.toISOString());
      if (to) params.set('to', to.toISOString());
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.set(key, value);
      });

      const url = safeJoin(CONFIG.apiUrl, `${endpoint}?${params.toString()}`);

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (res.status === 401 || res.status === 403) {
        toast.error('Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return null;
      }

      if (!res.data?.success) {
        // Non-blocking: log but don't toast for every sub-request
        console.warn(`[analytics] ${endpoint} failed:`, res.data?.message);
        return null;
      }

      return res.data.data ?? res.data;
    },
    [router]
  );

  // Tab 0

  const fetchNewUsers = useCallback(
    async (from, to) => {
      const totalRes = await apiGet('v1/admin/report/total-new-users', from, to);
      const byCountryRes = await apiGet('v1/admin/report/by-country-new-users', from, to);
      const perDayRes = await apiGet('v1/admin/report/per-day-new-users', from, to);

      const merged = {
        range: totalRes?.range ?? { from: from?.toISOString(), to: to?.toISOString() },
        total_users: totalRes?.total_users ?? 0,
        by_country: byCountryRes?.by_country ?? [],
        per_day: perDayRes?.per_day ?? [],
      };

      setNewUsersData(merged);
    },
    [apiGet]
  );

  // Tab 1 — Revenue  (4 parallel requests)

  const fetchRevenue = useCallback(
    async (from, to) => {
      const totalRes = await apiGet('v1/admin/report/total-revenue', from, to);
      const perDayRes = await apiGet('v1/admin/report/per-day-revenue', from, to);
      const byCountryRes = await apiGet('v1/admin/report/by-country-revenue', from, to);
      const topUsersRes = await apiGet('v1/admin/report/top-users-revenue', from, to);

      const merged = {
        range: totalRes?.range ?? { from: from?.toISOString(), to: to?.toISOString() },
        total: totalRes?.total ?? { purchases: 0, revenue: 0 },
        per_day: perDayRes?.per_day ?? [],
        by_country: byCountryRes?.by_country ?? [],
        top_users: topUsersRes?.top_users ?? [],
      };

      setRevenueData(merged);
    },
    [apiGet]
  );

  // Tab 2

  const fetchCoinSpend = useCallback(
    async (from, to) => {
      const totalCoinsRes = await apiGet('v1/admin/report/total-coins-spent', from, to);

      const perDayTotalRes = await apiGet('v1/admin/report/per-day-total', from, to);
      const perDayMsgCoinsRes = await apiGet('v1/admin/report/per-day-total-msg', from, to);
      const perDayCallCoinsRes = await apiGet('v1/admin/report/per-day-total-call', from, to);
      const countryWiseCoinSpentRes = await apiGet(
        'v1/admin/report/country-wise-coin-spent',
        from,
        to
      );

      const topCountriesRes = await apiGet('v1/admin/report/top-countries', from, to);
      const usersMsgCoinSpentRes = await apiGet(
        'v1/admin/report/users-coin-spent-message',
        from,
        to
      );
      const usersCallCoinSpentRes = await apiGet('v1/admin/report/users-coin-spent-call', from, to);

      const countryMsgCoinsRes = await apiGet(
        'v1/admin/report/country-coin-spent-message',
        from,
        to
      );
      const countryCallCoinsRes = await apiGet('v1/admin/report/country-coin-spent-call', from, to);

      const merged = {
        total_coins_spent: totalCoinsRes?.total_coins_spent ?? 0,

        per_day_total: perDayTotalRes?.per_day_total ?? [],
        per_day_total_msg: perDayMsgCoinsRes?.per_day_total_msg ?? [],
        per_day_total_call: perDayCallCoinsRes?.per_day_total_call ?? [],

        // keep the rest as you already use them
        top_countries: topCountriesRes?.top_countries ?? [],
        users_message_coin_spent: usersMsgCoinSpentRes?.users_message_coin_spent ?? [],
        users_video_call_coin_spent: usersCallCoinSpentRes?.users_video_call_coin_spent ?? [],

        country_wise_message_coin_spent:
          countryMsgCoinsRes?.country_wise_message_coin_spent ??
          countryMsgCoinsRes?.country_wise_message_coin_spent ??
          [],
        country_wise_video_call_coin_spent:
          countryCallCoinsRes?.country_wise_video_call_coin_spent ??
          countryCallCoinsRes?.country_wise_video_call_coin_spent ??
          [],

        country_wise_coin_spent: countryWiseCoinSpentRes?.country_wise_coin_spent ?? [],
      };

      setCoinSpendData(merged);
    },
    [apiGet]
  );

  const fetchAds = useCallback(
    async (from, to) => {
      const perDayRes = await apiGet('v1/admin/report/per-day-ads', from, to);
      const perDayCountryRes = await apiGet('v1/admin/report/per-day-country-ads', from, to);

      // per_day
      const per_day = perDayRes?.per_day ?? [];

      // per_day_country
      const per_day_country = perDayCountryRes?.per_day_country ?? [];

      // TOP 10 countries (computed on frontend from per_day_country)
      const totalsMap = new Map();
      for (const r of per_day_country) {
        const cc = r?.country && String(r.country).trim() ? String(r.country).trim() : 'Unknown';
        const c = Number(r?.count || 0);
        totalsMap.set(cc, (totalsMap.get(cc) || 0) + c);
      }

      const top_10_countries = Array.from(totalsMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const merged = {
        range: perDayRes?.range ??
          perDayCountryRes?.range ?? { from: from?.toISOString(), to: to?.toISOString() },
        per_day,
        per_day_country,
        top_10_countries,
      };

      setAdsData(merged);
    },
    [apiGet]
  );

  const fetchDataForTab = useCallback(
    async (tab, from, to) => {
      try {
        setLoading(true);
        if (tab === 0) await fetchNewUsers(from, to);
        if (tab === 1) await fetchRevenue(from, to);
        if (tab === 2) await fetchCoinSpend(from, to);
        if (tab === 3) await fetchAds(from, to);
      } catch (e) {
        console.error('fetchDataForTab error:', e);
        toast.error('Network error while fetching analytics');
      } finally {
        setLoading(false);
      }
    },
    [fetchNewUsers, fetchRevenue, fetchCoinSpend, fetchAds]
  );

  useEffect(() => {
    const { from, to } = getDefaultDates(30);
    fetchDataForTab(0, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (_, newTab) => {
    setActiveTab(newTab);
    const { from, to } = getDefaultDates(selectedPreset ?? 30);
    fetchDataForTab(newTab, from, to);
  };

  const handlePresetSelect = (days) => {
    setSelectedPreset(days);
    const { from, to } = getDefaultDates(days);
    setValue('from', from);
    setValue('to', to);
    setShowCustomRange(false);
    fetchDataForTab(activeTab, from, to);
  };

  const onApplyFilters = (values) => {
    setSelectedPreset(null);
    fetchDataForTab(activeTab, values.from, values.to);
  };

  const onResetFilters = () => {
    const defaults = getDefaultDates(30);
    setSelectedPreset(30);
    setShowCustomRange(false);
    reset(defaults);
    fetchDataForTab(activeTab, defaults.from, defaults.to);
  };

  const chartColors = useMemo(
    () => ({
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      info: theme.palette.info.main,
    }),
    [theme]
  );

  const commonChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: 500 } },
        },
        tooltip: {
          enabled: true,
          backgroundColor: alpha(theme.palette.grey[900], 0.92),
          titleColor: theme.palette.common.white,
          bodyColor: theme.palette.common.white,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: { title: (items) => items[0].label },
        },
      },
    }),
    [theme]
  );

  const lineChartOptions = useMemo(
    () => ({
      ...commonChartOptions,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: alpha(theme.palette.grey[500], 0.08), drawBorder: false },
          ticks: {
            callback: (value) => formatNumber(value),
            font: { size: 11 },
            color: theme.palette.text.secondary,
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: theme.palette.text.secondary, maxRotation: 45 },
        },
      },
    }),
    [commonChartOptions, theme]
  );

  const barChartOptions = useMemo(
    () => ({
      ...commonChartOptions,
      plugins: { ...commonChartOptions.plugins, legend: { display: false } },
      scales: lineChartOptions.scales,
    }),
    [commonChartOptions, lineChartOptions]
  );

  const pieChartOptions = useMemo(
    () => ({
      ...commonChartOptions,
      plugins: {
        ...commonChartOptions.plugins,
        legend: {
          display: true,
          position: isMobile ? 'bottom' : 'right',
          labels: { usePointStyle: true, padding: 16, font: { size: 11, weight: 500 } },
        },
      },
    }),
    [commonChartOptions, isMobile]
  );

  const sharedTabProps = {
    loading,
    chartColors,
    barChartOptions,
    lineChartOptions,
    pieChartOptions,
    getCountryName,
    formatNumber,
    formatCurrency: formatCurrencyCompactINR,
    formatCurrencyCompact: formatCurrencyCompactINR,
    KpiCard,
    ChartSkeleton,
    TableSkeleton,
    EmptyState,
    theme,
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 700 }}>
            Analytics & Reports
          </Typography>
        </Box>
      </Stack>

      <DateFilters
        control={control}
        onApply={handleSubmit(onApplyFilters)}
        onReset={onResetFilters}
        loading={loading}
        onPresetSelect={handlePresetSelect}
        selectedPreset={selectedPreset}
        showCustomRange={showCustomRange}
        onToggleCustomRange={setShowCustomRange}
        open={filtersOpen}
        onToggleOpen={setFiltersOpen}
      />

      <Card sx={{ boxShadow: theme.customShadows?.card }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ px: 3, py: 0.5 }}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab
            label="New Users"
            icon={<Iconify icon="solar:users-group-rounded-bold" width={24} />}
            iconPosition="start"
          />
          <Tab
            label="Revenue"
            icon={<Iconify icon="solar:dollar-bold" width={24} />}
            iconPosition="start"
          />
          <Tab
            label="Coin Spend"
            icon={<Iconify icon="solar:wallet-money-bold" width={24} />}
            iconPosition="start"
          />
          <Tab
            label="Ads"
            icon={<Iconify icon="material-symbols:ads-click" width={24} />}
            iconPosition="start"
          />
        </Tabs>
      </Card>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <AnalyticsUsersTab {...sharedTabProps} newUsersData={newUsersData} />}
        {activeTab === 1 && <AnalyticsRevenueTab {...sharedTabProps} revenueData={revenueData} />}
        {activeTab === 2 && (
          <AnalyticsCoinSpendTab {...sharedTabProps} coinSpendData={coinSpendData} />
        )}
        {activeTab === 3 && <AnalyticsAdsTab {...sharedTabProps} adsData={adsData} />}
      </Box>
    </DashboardContent>
  );
}

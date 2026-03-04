'use client';

import { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';

import Table from '@mui/material/Table';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import { Box, Card, Chip, Grid, Stack, Divider, Typography } from '@mui/material';

import { COUNTRY_COLORS, RANK_MEDAL_COLORS } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import CountryBadge from 'src/components/chip/country-badge';

export default function AnalyticsAdsTab({
  loading,
  adsData,
  lineChartOptions,
  barChartOptions,
  formatNumber,
  getCountryName,
  KpiCard,
  ChartSkeleton,
  TableSkeleton,
  EmptyState,
  theme,
}) {
  const perDay = adsData?.per_day ?? [];
  const perDayCountry = adsData?.per_day_country ?? [];
  const top10 = adsData?.top_10_countries ?? [];

  const totalAds = useMemo(
    () => perDay.reduce((sum, r) => sum + Number(r?.count || 0), 0),
    [perDay]
  );

  const topCountry = useMemo(() => {
    if (!top10.length) return null;
    return [...top10].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0];
  }, [top10]);

  const topCountryCode = String(topCountry?.country || '')
    .trim()
    .toUpperCase();
  const isUnknownTopCountry =
    !topCountryCode || ['UNKNOWN', 'N/A', 'NA', 'NULL', ''].includes(topCountryCode);

  // Aggregate perDayCountry → total count per country, sorted desc
  const aggregatedCountries = useMemo(() => {
    const map = {};
    perDayCountry.forEach((r) => {
      const cc = r.country && String(r.country).trim() ? String(r.country).trim() : 'Unknown';
      map[cc] = (map[cc] || 0) + Number(r.count || 0);
    });
    return Object.entries(map)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [perDayCountry]);

  const infoColor = theme?.palette?.info?.main || '#0EA5E9';

  const lineData = useMemo(() => {
    const labels = perDay.map((r) => String(r.day));
    const values = perDay.map((r) => Number(r.count || 0));
    return {
      labels,
      datasets: [
        {
          label: 'Ad Views',
          data: values,
          fill: true,
          tension: 0.35,
          borderColor: theme?.palette?.warning?.main || '#FF9800',
          backgroundColor: alpha(theme?.palette?.warning?.main || '#FF9800', 0.12),
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: theme?.palette?.warning?.main || '#FF9800',
          pointBorderColor: theme?.palette?.background?.paper || '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [perDay, theme]);

  const barTopCountries = useMemo(() => {
    const labels = top10.map((r) => getCountryName?.(r.country) || r.country || 'Unknown');
    const values = top10.map((r) => Number(r.count || 0));
    return {
      labels,
      datasets: [
        {
          label: 'Ad Views',
          data: values,
          borderRadius: 10,
          backgroundColor: COUNTRY_COLORS.slice(0, values.length).map((c) => alpha(c, 0.85)),
          borderColor: COUNTRY_COLORS.slice(0, values.length),
          borderWidth: 1.5,
        },
      ],
    };
  }, [top10, getCountryName]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <ChartSkeleton />
            </Grid>
          ))}
        </Grid>
        <TableSkeleton cols={4} />
      </Stack>
    );
  }
  if (adsData === null || adsData === undefined) {
    return (
      <EmptyState title="No Ads Data" description="No ad views found for the selected range." />
    );
  }
  return (
    <Stack spacing={3}>
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <KpiCard
            title="Total Ad Views"
            value={formatNumber(totalAds)}
            icon="material-symbols:ads-click"
            color="warning"
            subtitle={`Across ${perDay.length} days`}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard
            title="Countries"
            value={formatNumber(aggregatedCountries.length)}
            icon="solar:global-bold"
            color="primary"
            subtitle="Unique countries"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard
            title="Top Country"
            value={
              topCountry
                ? getCountryName?.(topCountry.country) || topCountry.country || 'Unknown'
                : '—'
            }
            icon="solar:global-bold"
            color="info"
            subtitle={
              topCountry
                ? `${formatNumber(Number(topCountry.count || 0))} ad views`
                : 'No country data'
            }
            rightSlot={
              topCountry && !isUnknownTopCountry ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    component="img"
                    src={`https://flagcdn.com/w160/${topCountryCode.toLowerCase()}.png`}
                    alt={getCountryName?.(topCountryCode) || topCountryCode}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                  />
                </Box>
              ) : (
                <Iconify icon="solar:global-bold" width={36} />
              )
            }
          />
        </Grid>
      </Grid>

      {/* ── Divider: Ad Performance (warning/yellow) ──────────────────────── */}
      <Divider>
        <Chip
          icon={<Iconify icon="solar:chart-bold" width={16} />}
          label="Ad Performance"
          color="warning"
          sx={{ fontWeight: 600, px: 1.5 }}
        />
      </Divider>

      {/* ── Line Chart — Full Width ────────────────────────────────────────── */}
      <Card sx={{ p: 2.5, boxShadow: theme?.customShadows?.card }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Ad Views Per Day
          </Typography>
          <Chip label={`${perDay.length} Days`} size="small" color="warning" variant="soft" />
        </Stack>
        {perDay.length === 0 ? (
          <Box
            sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              No daily ad view data available for this period
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 280 }}>
            <Line data={lineData} options={lineChartOptions} />
          </Box>
        )}
      </Card>

      {/* ── Daily Breakdown Table — Full Width ────────────────────────────── */}
      <Card
        sx={{
          boxShadow: theme?.customShadows?.card,
          border: `1px solid ${alpha(theme?.palette?.warning?.main || '#FF9800', 0.1)}`,
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Daily Breakdown
              </Typography>
            </Stack>
            <Chip
              label={`Total: ${formatNumber(totalAds)}`}
              size="small"
              sx={{
                bgcolor: '#9b9561', // soft yellow
                color: '#5D4037',
                fontWeight: 700,
              }}
              //   sx={{ bgcolor: alpha('#e0ac53', 0.12), color: '#925322', fontWeight: 700 }}
            />
          </Stack>
        </Box>
        <TableContainer sx={{ maxHeight: 340 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>Day</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  Ad Views
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {perDay.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 3, textAlign: 'center' }}
                    >
                      No daily data available for this period
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                perDay.map((r) => (
                  <TableRow
                    key={String(r.day)}
                    sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {String(r.day)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#B45309' }}>
                        {formatNumber(Number(r.count || 0))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ── Divider: Country Analytics (info/sky) ─────────────────────────── */}
      <Divider>
        <Chip
          icon={<Iconify icon="solar:global-bold" width={16} />}
          label="Country Analytics"
          color="info"
          sx={{ fontWeight: 600, px: 1.5 }}
        />
      </Divider>

      {/* ── Top 10 Countries Bar Chart  ───────────────────────── */}

      <Card sx={{ p: 2.5, boxShadow: theme?.customShadows?.card }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Top 10 Countries
          </Typography>
          <Chip label={`${top10.length} Countries`} size="small" color="info" variant="soft" />
        </Stack>
        {top10.length === 0 ? (
          <Box
            sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              No top country data available for this period
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 320 }}>
            <Bar data={barTopCountries} options={barChartOptions} />
          </Box>
        )}
      </Card>

      {/* ── All Countries Aggregated — Full Width ─────────────────────────── */}
      <Card
        sx={{
          boxShadow: theme?.customShadows?.card,
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  All Countries
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={`${aggregatedCountries.length} Countries`}
              size="small"
              color="info"
              variant="soft"
            />
          </Stack>
        </Box>

        <TableContainer sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  Country
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  Total Views
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {aggregatedCountries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 3, textAlign: 'center' }}
                    >
                      No country data available for this period
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                aggregatedCountries.map((r, idx) => {
                  const rankColor =
                    idx < 3 ? RANK_MEDAL_COLORS[idx] : COUNTRY_COLORS[idx % COUNTRY_COLORS.length];
                  return (
                    <TableRow
                      key={`${r.country}-${idx}`}
                      sx={{ '&:nth-of-type(odd)': { bgcolor: alpha(infoColor, 0.03) } }}
                    >
                      <TableCell>
                        <Chip
                          label={`#${idx + 1}`}
                          size="small"
                          color={idx < 3 ? 'info' : 'default'}
                          variant={idx < 3 ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <CountryBadge code={r.country} />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: infoColor }}>
                          {formatNumber(r.count)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}

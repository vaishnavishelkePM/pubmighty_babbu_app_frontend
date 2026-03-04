
'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import {
  Box,
  Tab,
  Card,
  Grid,
  Tabs,
  Stack,
  Paper,
  Alert,
  Button,
  Select,
  Switch,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { TabPanel } from 'src/utils/user-helper';
import { getCookie, isMaskedSecret } from 'src/utils/helper';
import {
  SECTIONS,
  FIELD_DEFS,
  DurationInput,

  TwoFAToggleField,
} from 'src/utils/setting-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';


// ─── Main SettingsView ────────────────────────────────────────────────────────
export default function SettingsView() {
  const session_key = getCookie('session_key');
  const baseUrl = `${CONFIG.apiUrl}/v1/admin`;

  const [tab, setTab] = useState(0);
  const [isLoading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverSettings, setServerSettings] = useState(null);

  const [form, setForm] = useState(() => {
    const out = {};
    for (const s of SECTIONS) out[s.key] = {};
    return out;
  });

  const dirtyRef = useRef(null);
  if (dirtyRef.current === null) {
    const d = {};
    for (const s of SECTIONS) d[s.key] = new Set();
    dirtyRef.current = d;
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${session_key}`, 'Content-Type': 'application/json' },
        validateStatus: () => true,
      });
      const result = res.data;
      if (result?.success) {
        setServerSettings(result.data);
        const merged = {};
        for (const s of SECTIONS) merged[s.key] = result.data?.[s.key] || {};
        setForm(merged);
        const d = {};
        for (const s of SECTIONS) d[s.key] = new Set();
        dirtyRef.current = d;
      } else {
        toast.error(result?.msg || 'Failed to load settings');
      }
    } catch (err) {
      console.error('fetchSettings error:', err);
      toast.error('Error while loading settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Field helpers ─────────────────────────────────────────────────────────
  const markDirty = (sectionKey, fieldKey) => {
    if (!dirtyRef.current[sectionKey]) dirtyRef.current[sectionKey] = new Set();
    dirtyRef.current[sectionKey].add(fieldKey);
  };

  const setField = (sectionKey, fieldKey) => (value) => {
    setForm((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev?.[sectionKey] || {}), [fieldKey]: value },
    }));
    markDirty(sectionKey, fieldKey);
  };

  const sectionDirtyCount = (sectionKey) => dirtyRef.current?.[sectionKey]?.size || 0;

  // ── Save / Reset ──────────────────────────────────────────────────────────
  const buildPayloadForSection = (sectionKey) => {
    const keys = Array.from(dirtyRef.current?.[sectionKey] || []);
    const payload = {};
    for (const k of keys) {
      const v = form?.[sectionKey]?.[k];
      if (isMaskedSecret(v)) continue;
      payload[k] = v;
    }
    return { [sectionKey]: payload };
  };

  const handleSaveSection = async (sectionKey) => {
    if (sectionDirtyCount(sectionKey) === 0) {
      toast.info('No changes to save.');
      return;
    }
    const grouped = buildPayloadForSection(sectionKey);
    const sectionBody = grouped?.[sectionKey];
    if (!sectionBody || Object.keys(sectionBody).length === 0) {
      toast.info('Nothing to save (masked secret fields were not changed).');
      dirtyRef.current[sectionKey]?.clear();
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${baseUrl}/settings`, grouped, {
        headers: { Authorization: `Bearer ${session_key}`, 'Content-Type': 'application/json' },
        validateStatus: () => true,
      });
      const result = res.data;
      if (result?.success) {
        toast.success(result?.msg || 'Settings updated');
        setServerSettings(result.data);
        const merged = {};
        for (const s of SECTIONS) merged[s.key] = result.data?.[s.key] || {};
        setForm(merged);
        dirtyRef.current[sectionKey]?.clear();
      } else {
        toast.error(result?.msg || 'Failed to update settings');
      }
    } catch (err) {
      console.error('handleSaveSection error:', err);
      toast.error('Error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSection = (sectionKey) => {
    if (!serverSettings) return;
    setForm((prev) => ({ ...prev, [sectionKey]: serverSettings?.[sectionKey] || {} }));
    dirtyRef.current[sectionKey]?.clear();
    toast.success('Section reset to last saved values.');
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const sectionErrors = useMemo(() => {
    const errs = {};
    for (const sec of Object.keys(FIELD_DEFS)) {
      errs[sec] = {};
      for (const f of FIELD_DEFS[sec]) {
        // Skip duration fields — they self-constrain via part max values
        if (f.type !== 'number' || f.timeUnit) continue;
        const val = form?.[sec]?.[f.key];
        if (val === '' || val == null) continue;
        const n = Number(val);
        if (!Number.isFinite(n)) errs[sec][f.key] = 'Must be a number';
        else if (f.min != null && n < f.min) errs[sec][f.key] = `Must be >= ${f.min}`;
        else if (f.max != null && n > f.max) errs[sec][f.key] = `Must be <= ${f.max}`;
      }
    }
    return errs;
  }, [form]);

  const hasSectionErrors = (sectionKey) =>
    Object.keys(sectionErrors?.[sectionKey] || {}).length > 0;

  const isTwoFaOnlySection = (sectionKey) => {
    const fields = FIELD_DEFS[sectionKey] || [];
    return fields.length > 0 && fields.every((f) => f.type === 'twofa');
  };

  // ── Field renderer ────────────────────────────────────────────────────────
  const renderField = (sectionKey, f) => {
    // ── 2FA toggle ──────────────────────────────────────────────────────────
    if (f.type === 'twofa') {
      const currentVal = form?.security?.[f.key] ?? serverSettings?.security?.[f.key] ?? 'off';
      return (
        <TwoFAToggleField
          key={f.key}
          fieldDef={f}
          currentValue={currentVal}
          baseUrl={baseUrl}
          session_key={session_key}
        />
      );
    }

    const value = form?.[sectionKey]?.[f.key];
    const errText = sectionErrors?.[sectionKey]?.[f.key] || '';
    const hasErr = Boolean(errText);

    // ── Duration (time) fields ──────────────────────────────────────────────
    if (f.type === 'number' && f.timeUnit) {
      return (
        <DurationInput
          key={f.key}
          label={f.label}
          value={value ?? f.default ?? 0}
          onChange={setField(sectionKey, f.key)}
          unit={f.timeUnit}
          min={f.min}
          max={f.max}
          helperText={f.helper}
          error={hasErr}
        />
      );
    }

    // ── Bool toggle ─────────────────────────────────────────────────────────
    if (f.type === 'bool') {
      return (
        <Paper
          key={f.key}
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0, pr: 2 }}>
            <Typography sx={{ fontWeight: 800 }} noWrap>
              {f.label}
            </Typography>
            {f.helper && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {f.helper}
              </Typography>
            )}
          </Box>
          <Switch
            checked={Boolean(value)}
            onChange={(e) => setField(sectionKey, f.key)(e.target.checked)}
          />
        </Paper>
      );
    }

    // ── Select ──────────────────────────────────────────────────────────────
    if (f.type === 'select') {
      return (
        <FormControl key={f.key} fullWidth error={hasErr}>
          <InputLabel>{f.label}</InputLabel>
          <Select
            value={value ?? ''}
            label={f.label}
            onChange={(e) => setField(sectionKey, f.key)(e.target.value)}
          >
            {(f.options || []).map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{hasErr ? errText : f.helper || ' '}</FormHelperText>
        </FormControl>
      );
    }

    // ── Plain number ────────────────────────────────────────────────────────
    if (f.type === 'number') {
      return (
        <TextField
          key={f.key}
          fullWidth
          type="number"
          label={f.label}
          value={value ?? ''}
          onChange={(e) => setField(sectionKey, f.key)(e.target.value)}
          error={hasErr}
          helperText={hasErr ? errText : f.helper || ' '}
          inputProps={{ min: f.min, max: f.max }}
        />
      );
    }

    // ── Text (default) ──────────────────────────────────────────────────────
    const isSecretMasked = isMaskedSecret(value);
    const helper =
      f.secretLike && isSecretMasked
        ? 'Value is hidden. Type a new value only if you want to replace it.'
        : f.helper || ' ';

    return (
      <TextField
        key={f.key}
        fullWidth
        label={f.label}
        value={value ?? ''}
        onChange={(e) => setField(sectionKey, f.key)(e.target.value)}
        helperText={helper}
        placeholder={f.secretLike ? '********' : ''}
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardContent>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <CustomBreadcrumbs
          heading="Settings"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Settings' }]}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="mdi:refresh" />}
            onClick={fetchSettings}
            disabled={isLoading || saving}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Card sx={{ px: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          {(isLoading || saving) && <CircularProgress size={22} />}
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { minHeight: 44 } }}
        >
          {SECTIONS.map((s, idx) => (
            <Tab
              key={s.key}
              value={idx}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon={s.icon} width={18} />
                  <Typography sx={{ fontWeight: 800 }}>{s.label}</Typography>
                  {!isTwoFaOnlySection(s.key) && sectionDirtyCount(s.key) > 0 && (
                    <Box
                      sx={{
                        px: 1,
                        borderRadius: 999,
                        bgcolor: 'warning.lighter',
                        color: 'warning.dark',
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {sectionDirtyCount(s.key)}
                    </Box>
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>

        {SECTIONS.map((s, idx) => {
          const fields = FIELD_DEFS[s.key] || [];
          const twoFaOnly = isTwoFaOnlySection(s.key);

          return (
            <TabPanel key={s.key} value={tab} index={idx}>
              {isLoading ? (
                <Paper sx={{ borderRadius: 2, textAlign: 'center', p: 3 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading settings…
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2.5}>
                  <Paper sx={{ px: 1, py: 1.5, borderRadius: 2 }}>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      {fields.length === 0 ? (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            No fields configured for this section.
                          </Typography>
                        </Grid>
                      ) : (
                        fields.map((f) => (
                          <React.Fragment key={`${s.key}-${f.key}`}>
                            {f.newRow && <Grid item xs={12} />}
                            <Grid
                              item
                              xs={12}
                              md={f.type === 'bool' || f.type === 'twofa' ? 12 : 6}
                            >
                              {renderField(s.key, f)}
                            </Grid>
                          </React.Fragment>
                        ))
                      )}
                    </Grid>
                  </Paper>

                  {!twoFaOnly && (
                    <>
                      <Stack direction="row" spacing={1} justifyContent="flex-end" mb={2}>
                        <Button
                          variant="outlined"
                          color="inherit"
                          startIcon={<Iconify icon="mdi:restore" />}
                          onClick={() => handleResetSection(s.key)}
                          disabled={saving || isLoading || sectionDirtyCount(s.key) === 0}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Iconify icon="mdi:content-save" />}
                          onClick={() => handleSaveSection(s.key)}
                          disabled={
                            saving ||
                            isLoading ||
                            sectionDirtyCount(s.key) === 0 ||
                            hasSectionErrors(s.key)
                          }
                        >
                          Save Changes
                        </Button>
                      </Stack>

                      {hasSectionErrors(s.key) && (
                        <Alert severity="error" variant="soft">
                          Fix validation errors before saving.
                        </Alert>
                      )}
                    </>
                  )}
                </Stack>
              )}
            </TabPanel>
          );
        })}
      </Card>
    </DashboardContent>
  );
}

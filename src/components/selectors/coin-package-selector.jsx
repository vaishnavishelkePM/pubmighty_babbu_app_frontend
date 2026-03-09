'use client';

import axios from 'axios';
import { getCookie } from 'minimal-shared';
import { useRef, useMemo, useState, useEffect } from 'react';

import {
  Box,
  Chip,
  Stack,
  Avatar,
  TextField,
  Typography,
  Autocomplete,
  CircularProgress,
} from '@mui/material';

import { safeJoin, useDebounce } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function CoinPackageSelector({
  onPackageSelect,

  label = 'Coin Package',
  placeholder = 'Search package name or ID…',

  status = null,
  provider = null,
  googleProductId = null,
  isPopular = null,
  isAdsFree = null,
  minPrice = null,
  maxPrice = null,
  minFinalPrice = null,
  maxFinalPrice = null,

  sortBy = 'display_order',
  order = 'ASC',

  valueId = undefined,
  disabled = false,
  fullWidth = true,
  sx,
}) {
  const token = getCookie('session_key');

  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const seenIdsRef = useRef(new Set());
  const reqSeqRef = useRef(0);

  const debouncedTerm = useDebounce(inputValue, 300);

  //  IMPORTANT: must match backend prefix
  const LIST_URL = useMemo(() => safeJoin(CONFIG.apiUrl, 'v1/admin/coin-packages'), []);
  const ONE_URL = (id) => safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/${id}`);

  // ---------------- avatar url builder ----------------
  const packageAvatarSrc = (pkg) => {
    const raw =
      pkg?.cover ||
      pkg?.image ||
      pkg?.icon ||
      pkg?.photo ||
      pkg?.avatar ||
      pkg?.thumbnail ||
      pkg?.image_url ||
      pkg?.icon_url ||
      pkg?.image_path ||
      pkg?.cover_path ||
      '';

    if (!raw) return '';

    // already full url
    if (String(raw).startsWith('http')) return raw;

    // normalize
    let path = String(raw).replace(/^\/+/, '');

    /**
     *  Your storage is: public/images/coin-packages/
     * So if API returns only: "abc.png"
     * we must convert to: "images/coin-packages/abc.png"
     */
    const looksLikeFileOnly = !path.includes('/') && path.includes('.');
    if (looksLikeFileOnly) {
      path = `images/coin-packages/${path}`;
    }

    // if API returns "coin-packages/abc.png" (without images/)
    if (path.startsWith('coin-packages/')) {
      path = `images/${path}`;
    }

    // final url
    const joined = safeJoin(CONFIG.assetsUrl, path);

    // cache bust
    const v = pkg?.updated_at || pkg?.updatedAt || pkg?.created_at || pkg?.createdAt || Date.now();
    return joined.includes('?')
      ? `${joined}&v=${encodeURIComponent(v)}`
      : `${joined}?v=${encodeURIComponent(v)}`;
  };

  function isSpecialOption(opt) {
    return opt?.optionType === 'loadMore' || opt?.optionType === 'end';
  }

  function addFooterRows(list, currentPage, newTotalPages, newTotalRecords) {
    const clean = list.filter((o) => !isSpecialOption(o));
    if (currentPage < newTotalPages) clean.push({ id: LOAD_MORE_KEY, optionType: 'loadMore' });
    else clean.push({ id: END_OF_LIST_KEY, optionType: 'end', total: newTotalRecords });
    return clean;
  }

  function resetPaging() {
    setOptions([]);
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }

  async function fetchPage(targetPage, term) {
    const seq = ++reqSeqRef.current;

    try {
      setLoading(true);
      setErrorText('');

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('sortBy', String(sortBy || 'display_order'));
      params.set('order', String(order || 'ASC'));

      //  Search improvement:
      // - If user types only digits: treat as ID search (id=123)
      // - Else use name search (name=abc)
      if (term && term.trim()) {
        const t = term.trim();
        const s = String(t ?? '').trim();
        if (s !== '' && /^[0-9]+$/.test(s)) params.set('id', t);
        else params.set('name', t);
      }

      if (status !== null && status !== undefined && status !== '')
        params.set('status', String(status));
      if (provider !== null && provider !== undefined && provider !== '')
        params.set('provider', String(provider));
      if (googleProductId) params.set('google_product_id', String(googleProductId));

      if (isPopular !== null && isPopular !== undefined && isPopular !== '')
        params.set('is_popular', String(isPopular));
      if (isAdsFree !== null && isAdsFree !== undefined && isAdsFree !== '')
        params.set('is_ads_free', String(isAdsFree));

      if (minPrice !== null && minPrice !== undefined && minPrice !== '')
        params.set('min_price', String(minPrice));
      if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '')
        params.set('max_price', String(maxPrice));

      if (minFinalPrice !== null && minFinalPrice !== undefined && minFinalPrice !== '')
        params.set('min_final_price', String(minFinalPrice));
      if (maxFinalPrice !== null && maxFinalPrice !== undefined && maxFinalPrice !== '')
        params.set('max_final_price', String(maxFinalPrice));

      const url = `${LIST_URL}?${params.toString()}`;

      const result = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (seq !== reqSeqRef.current) return;

      const contentType = String(result.headers?.['content-type'] || '').toLowerCase();
      const data = result.data;

      if (result.status === 401 || result.status === 403)
        throw new Error('Unauthorized (admin session expired)');
      if (contentType.includes('text/html') || typeof data === 'string') {
        throw new Error(`API returned HTML (wrong endpoint / redirect). URL: ${url}`);
      }

      if (!data?.success)
        throw new Error(data?.msg || data?.message || `Request failed (HTTP ${result.status})`);

      //  Support both response shapes:
      // 1) { data: { rows: [], pagination: {} } }
      // 2) { data: { packages: [], pagination: {} } }
      const rows = data?.data?.rows || data?.data?.packages || [];
      const pagination = data?.data?.pagination || {};
      const newTotalPages = Number(pagination.totalPages || 1);
      const newTotalRecords = Number(pagination.totalRecords ?? pagination.total ?? rows.length);

      const appended = [];
      for (const r of rows) {
        if (!r?.id) continue;
        if (!seenIdsRef.current.has(r.id)) {
          seenIdsRef.current.add(r.id);
          appended.push(r);
        }
      }

      setOptions((prev) => {
        const base = targetPage === 1 ? [] : prev.filter((o) => !isSpecialOption(o));
        const combined = [...base, ...appended];
        return addFooterRows(combined, targetPage, newTotalPages, newTotalRecords);
      });

      setPage(targetPage);
      setTotalPages(newTotalPages);
      setTotalRecords(newTotalRecords);
    } catch (e) {
      setErrorText(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // reset + first page
  useEffect(() => {
    resetPaging();
    fetchPage(1, debouncedTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTerm,
    status,
    provider,
    googleProductId,
    isPopular,
    isAdsFree,
    minPrice,
    maxPrice,
    minFinalPrice,
    maxFinalPrice,
    sortBy,
    order,
  ]);

  //  Preselect by ID (robust)
  useEffect(() => {
    if (valueId == null || valueId === '') return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        // (A) Try /:id route
        const urlA = ONE_URL(valueId);
        const resA = await axios.get(urlA, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
          validateStatus: () => true,
        });

        const ctA = String(resA.headers?.['content-type'] || '').toLowerCase();
        const dataA = resA.data;

        let pkg = null;

        if (
          resA.status !== 404 &&
          !ctA.includes('text/html') &&
          typeof dataA !== 'string' &&
          dataA?.success
        ) {
          // support {data: pkg} or {data: {row: pkg}}
          pkg = dataA?.data?.row || dataA?.data || null;
        }

        // (B) Fallback: list filter by id
        if (!pkg?.id) {
          const params = new URLSearchParams();
          params.set('page', '1');
          params.set('id', String(valueId));
          params.set('limit', '1');

          const urlB = `${LIST_URL}?${params.toString()}`;

          const resB = await axios.get(urlB, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 20000,
            validateStatus: () => true,
          });

          const ctB = String(resB.headers?.['content-type'] || '').toLowerCase();
          const dataB = resB.data;

          if (!ctB.includes('text/html') && typeof dataB !== 'string' && dataB?.success) {
            const rowsB = dataB?.data?.rows || dataB?.data?.packages || [];
            pkg = rowsB?.[0] || null;
          }
        }

        if (cancelled) return;

        if (pkg?.id) {
          setSelected(pkg);

          if (!seenIdsRef.current.has(pkg.id)) {
            seenIdsRef.current.add(pkg.id);
            setOptions((prev) => [pkg, ...prev.filter((o) => !isSpecialOption(o))]);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  function handleLoadMoreClick(e) {
    e?.preventDefault?.();
    if (!loading && page < totalPages) fetchPage(page + 1, debouncedTerm);
  }

  function getPrimaryText(pkg) {
    const name = String(pkg?.name || '').trim();
    const id = pkg?.id != null ? `#${pkg.id}` : '';
    return name ? `${name} ${id}`.trim() : id || '—';
  }

  function getSecondaryText(pkg) {
    const bits = [];
    if (pkg?.coins != null) bits.push(`${pkg.coins} coins`);
    if (pkg?.final_price != null) bits.push(`Final ₹${pkg.final_price}`);
    else if (pkg?.price != null) bits.push(`₹${pkg.price}`);
    if (pkg?.provider) bits.push(String(pkg.provider));
    return bits.join(' • ');
  }

  function renderBadges(pkg) {
    const badges = [];
    if (pkg?.is_popular) badges.push({ label: 'Popular', color: 'primary' });
    if (pkg?.is_ads_free) badges.push({ label: 'Ads Free', color: 'success' });

    const st = pkg?.status ? String(pkg.status) : null;
    if (st) badges.push({ label: st, color: st === 'active' ? 'success' : 'default' });

    return (
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {badges.map((b, idx) => (
          <Chip key={`${b.label}-${idx}`} label={b.label} color={b.color} size="small" />
        ))}
      </Box>
    );
  }

  return (
    <Autocomplete
      sx={sx}
      fullWidth={fullWidth}
      disabled={disabled}
      loading={loading}
      options={options}
      value={selected}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      getOptionLabel={(opt) => {
        if (!opt) return '';
        if (opt.id === LOAD_MORE_KEY || opt.id === END_OF_LIST_KEY) return '';
        return getPrimaryText(opt);
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          onPackageSelect && onPackageSelect('', null);
          return;
        }

        if (!newVal) {
          setSelected(null);
          return;
        }

        if (newVal?.id === LOAD_MORE_KEY) {
          handleLoadMoreClick();
          return;
        }

        if (newVal?.id === END_OF_LIST_KEY) return;

        setSelected(newVal);
        onPackageSelect && onPackageSelect(newVal.id, newVal);
      }}
      onInputChange={(_, newInput, reason) => {
        if (reason === 'input' || reason === 'clear') setInputValue(newInput);
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          helperText={errorText || ''}
          error={Boolean(errorText)}
        />
      )}
      renderOption={(props, option) => {
        if (option?.optionType === 'loadMore') {
          return (
            <li
              {...props}
              key={LOAD_MORE_KEY}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLoadMoreClick}
              style={{ cursor: loading ? 'default' : 'pointer' }}
            >
              <Box sx={{ py: 1, width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                {loading ? <CircularProgress size={16} /> : null}
                <Typography variant="body2">{loading ? 'Loading…' : 'Load more…'}</Typography>
              </Box>
            </li>
          );
        }

        if (option?.optionType === 'end') {
          return (
            <li
              {...props}
              key={END_OF_LIST_KEY}
              aria-disabled
              onMouseDown={(e) => e.preventDefault()}
            >
              <Box sx={{ py: 1, width: '100%', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  — End of list ({option?.total ?? 0} items loaded) —
                </Typography>
              </Box>
            </li>
          );
        }

        return (
          <li {...props} key={option.id}>
            <Stack direction="row" spacing={1.25} sx={{ width: '100%', alignItems: 'center' }}>
              <Avatar
                src={packageAvatarSrc(option)}
                alt={option?.name || `#${option?.id}`}
                sx={{ width: 38, height: 38 }}
                variant="rounded"
                imgProps={{
                  onError: (e) => {
                    // fallback to blank
                    e.currentTarget.src = '';
                  },
                }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {getPrimaryText(option)}
                  </Typography>
                  {renderBadges(option)}
                </Box>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {getSecondaryText(option)}
                </Typography>

                {option?.google_product_id ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Product: {option.google_product_id}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </li>
        );
      }}
    />
  );
}

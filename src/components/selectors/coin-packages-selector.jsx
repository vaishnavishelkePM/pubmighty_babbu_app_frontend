'use client';

import { useRef, useState, useEffect } from 'react';

import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { getCookie, useDebounce } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function CoinPackageSelector({
  onSelect,
  label = 'Select coin package',
  placeholder = 'Type a package name…',
  statusFilter = null,
  provider = undefined,
  isPopular = undefined,
  isAdsFree = undefined,
  valueId = undefined,
  disabled = false,
  fullWidth = true,
  sx,
  excludeId = undefined, //  optional: hide current deleting package
}) {
  const getToken = () => getCookie('session_key');

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

  useEffect(() => {
    resetPaging();
    fetchPage(1, debouncedTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, statusFilter, provider, isPopular, isAdsFree, excludeId]);

  useEffect(() => {
    if (valueId == null || valueId === '') return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('id', String(valueId));
        params.set('sortBy', 'display_order');
        params.set('order', 'ASC');

        const res = await fetch(`${CONFIG.apiUrl}/v1/admin/coin-packages?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
        });

        const json = await res.json();
        if (cancelled) return;
        if (!json?.success) return;

        const row = (json?.data?.rows || []).find((x) => String(x?.id) === String(valueId)) || null;
        if (row?.id) {
          setSelected(row);
          if (!seenIdsRef.current.has(row.id)) {
            seenIdsRef.current.add(row.id);
            setOptions((prev) => [row, ...prev]);
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
  }, [valueId]);

  function resetPaging() {
    setOptions([]);
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }

  function toBoolFlag(v) {
    if (v === undefined || v === null || v === '') return null;
    if (v === true || v === 1 || v === '1') return 1;
    if (v === false || v === 0 || v === '0') return 0;
    return null;
  }

  async function fetchPage(targetPage, term) {
    const seq = ++reqSeqRef.current;

    try {
      setLoading(true);
      setErrorText('');

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('sortBy', 'display_order');
      params.set('order', 'ASC');

      if (term && term.trim()) params.set('name', term.trim());

      if (statusFilter !== null && statusFilter !== undefined && statusFilter !== '') {
        params.set('status', String(statusFilter));
      }

      if (provider) params.set('provider', String(provider));

      const pop = toBoolFlag(isPopular);
      if (pop !== null) params.set('is_popular', String(pop));

      const ads = toBoolFlag(isAdsFree);
      if (ads !== null) params.set('is_ads_free', String(ads));

      //  IMPORTANT FIX: correct endpoint
      const res = await fetch(`${CONFIG.apiUrl}/v1/admin/coin-packages?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const json = await res.json();
      if (seq !== reqSeqRef.current) return;
      if (!json?.success) throw new Error(json?.msg || json?.message || 'Request failed');

      let rows = json?.data?.rows || [];
      const pagination = json?.data?.pagination || {};

      //  optional: remove current deleting package from list
      if (excludeId != null && excludeId !== '') {
        rows = rows.filter((x) => String(x?.id) !== String(excludeId));
      }

      const newTotalPages = Number(pagination.totalPages || 1);
      const newTotalRecords = Number(pagination.totalRecords ?? pagination.total ?? rows.length);

      const appended = [];
      for (const r of rows) {
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

  function addFooterRows(list, currentPage, newTotalPages, newTotalRecords) {
    const clean = list.filter((o) => !isSpecialOption(o));
    if (currentPage < newTotalPages) {
      clean.push({ id: LOAD_MORE_KEY, optionType: 'loadMore' });
    } else {
      clean.push({ id: END_OF_LIST_KEY, optionType: 'end', total: newTotalRecords });
    }
    return clean;
  }

  function isSpecialOption(opt) {
    return opt?.optionType === 'loadMore' || opt?.optionType === 'end';
  }

  function handleLoadMoreClick(e) {
    e?.preventDefault?.();
    if (!loading && page < totalPages) {
      fetchPage(page + 1, debouncedTerm);
    }
  }

  function coverSrc(cover) {
    if (!cover) return '';
    if (String(cover).startsWith('http')) return String(cover);
    return `${CONFIG.assetsUrl}/images/coin-packages/${cover}`;
  }

  function getPrimaryText(p) {
    return p?.name || '';
  }

  function getSecondaryText(p) {
    const bits = [];
    if (p?.coins != null) bits.push(`${p.coins} coins`);
    if (p?.final_price != null && p?.currency) bits.push(`${p.currency} ${p.final_price}`);
    if (p?.google_product_id) bits.push(p.google_product_id);
    return bits.filter(Boolean).join(' • ');
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
          onSelect?.('', null);
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
        onSelect?.(newVal.id, newVal);
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Avatar
                src={coverSrc(option.cover)}
                alt={getPrimaryText(option)}
                sx={{ width: 44, height: 44, borderRadius: 1 }}
              />
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {getPrimaryText(option)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {getSecondaryText(option)}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}

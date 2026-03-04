'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { getCookie, useDebounce } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function AdminSelector({
  onAdminSelect, // (id: number|string, admin: any|null) => void
  label = 'Select admin',
  placeholder = 'Type username OR admin id…',

  // Filters (same as getAdmins controller)
  role = '', // superAdmin | staff | paymentManager | support | ''
  status = null, // 0|1|2|3|null
  twoFactorEnabled = null, // 0|1|2|null
  email = '',

  // optional: preselect by admin id
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

  const isNumericId = (v) => /^\d+$/.test(String(v || '').trim());

  const isSpecialOption = (opt) => opt?.optionType === 'loadMore' || opt?.optionType === 'end';

  const addFooterRows = (list, currentPage, newTotalPages, newTotalRecords) => {
    const clean = list.filter((o) => !isSpecialOption(o));
    if (currentPage < newTotalPages) {
      clean.push({ id: LOAD_MORE_KEY, optionType: 'loadMore' });
    } else {
      clean.push({ id: END_OF_LIST_KEY, optionType: 'end', total: newTotalRecords });
    }
    return clean;
  };

  const resetPaging = useCallback(() => {
    setOptions([]);
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }, []);
  //this is what is okay

  const buildQuery = useCallback(
    (targetPage, term) => {
      const params = new URLSearchParams();

      params.set('page', String(targetPage || 1));
      params.set('sortBy', 'createdAt');
      params.set('sortDir', 'desc');

      const t = String(term || '').trim();

      if (t) {
        if (isNumericId(t)) {
          // ' search by admin id
          params.set('id', t); // <-- backend should accept "id"
        } else {
          // ' search by username
          params.set('username', t);
        }
      }
      if (email && String(email).trim()) params.set('email', String(email).trim());

      if (role && String(role).trim()) params.set('role', String(role).trim());

      if (status !== null && status !== undefined && status !== '') {
        params.set('status', String(status));
      }

      if (twoFactorEnabled !== null && twoFactorEnabled !== undefined && twoFactorEnabled !== '') {
        params.set('twoFactorEnabled', String(twoFactorEnabled));
      }

      return params.toString();
    },
    [email, role, status, twoFactorEnabled]
  );

  const fetchPage = useCallback(
    async (targetPage, term) => {
      const seq = ++reqSeqRef.current;

      try {
        setLoading(true);
        setErrorText('');

        const url = `${CONFIG.apiUrl}/v1/admin/manage-admins?${buildQuery(targetPage, term)}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (seq !== reqSeqRef.current) return;
        if (!json?.success) throw new Error(json?.msg || json?.message || 'Request failed');

        // getAdmins returns: data: { rows, pagination: { page, limit, total, totalPages } }
        const rows = json?.data?.rows || [];
        const pag = json?.data?.pagination || {};

        const newTotalPages = Number(pag.totalPages || 1);
        const newTotalRecords = Number(pag.total || rows.length);

        const appended = [];
        for (const r of rows) {
          if (r?.id && !seenIdsRef.current.has(r.id)) {
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
    },
    [buildQuery, token]
  );

  // reset & fetch when search / filters change
  useEffect(() => {
    resetPaging();
    fetchPage(1, debouncedTerm);
  }, [debouncedTerm, resetPaging, fetchPage]);

  //  preselect by ID (uses /manage-admins/:id)
  useEffect(() => {
    if (valueId == null || valueId === '') return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        const res = await fetch(`${CONFIG.apiUrl}/v1/admin/manage-admins/${valueId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json?.success) throw new Error(json?.msg || 'Not found');

        const a = json?.data || null;

        if (a?.id) {
          setSelected(a);
          if (!seenIdsRef.current.has(a.id)) {
            seenIdsRef.current.add(a.id);
            setOptions((prev) => [a, ...prev]);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // eslint-disable-next-line consistent-return
    return () => {
      cancelled = true;
    };
  }, [valueId, token]);

  const handleLoadMoreClick = (e) => {
    e?.preventDefault?.();
    if (!loading && page < totalPages) {
      fetchPage(page + 1, debouncedTerm);
    }
  };

  const getOptionPrimaryText = (a) => a?.username || a?.email || '';

  const getOptionSecondaryText = (a) => {
    const bits = [];
    if (a?.id) bits.push(`#${a.id}`);
    if (a?.role) bits.push(a.role);
    if (typeof a?.two_fa !== 'undefined' && a?.two_fa !== null) bits.push(`2FA:${a.two_fa}`);
    return bits.join(' • ');
  };

  //  Admin avatar resolver

  const getAdminAvatar = (a) => {
    const av = a?.avatar || a?.profile_image || a?.profileImage || '';
    if (!av) return '';
    if (/^https?:\/\//i.test(String(av))) return String(av);

    let path = String(av).replaceAll('\\', '/').replace(/^\/+/, '');
    if (path.startsWith('uploads/'))
      return `${String(CONFIG.assetsUrl || '').replace(/\/+$/, '')}/${path}`;

    // fallback folder (adjust if you store admin avatars elsewhere)
    path = `uploads/avatar/admin/${path}`;
    return `${String(CONFIG.assetsUrl || '').replace(/\/+$/, '')}/${path}`;
  };

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
        return getOptionPrimaryText(opt);
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          try {
            onAdminSelect && onAdminSelect('', null);
          } catch {
            /* ignore */
          }
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
        try {
          onAdminSelect && onAdminSelect(newVal.id, newVal);
        } catch {
          /* ignore */
        }
      }}
      onInputChange={(_, newInput, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(newInput);
        }
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLoadMoreClick(e);
                }
              }}
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
                gridTemplateColumns: '40px 1fr',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Avatar
                src={getAdminAvatar(option)}
                alt={getOptionPrimaryText(option)}
                sx={{ width: 40, height: 50, borderRadius: 1 }}
              />
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {getOptionPrimaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {getOptionSecondaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {option?.email || '—'}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}

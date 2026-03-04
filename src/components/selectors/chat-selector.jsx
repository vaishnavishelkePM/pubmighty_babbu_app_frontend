'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { safeTrim, getCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function ChatSelectorByUser({
  userId, // required (number|string) => chats will load for this user
  onChatSelect, // (chatId, otherUserId) => void
  label = 'Select chat',
  placeholder = 'Select one chat...',
  status, // optional: "active" | "blocked" | "deleted"
  disabled = false,
  fullWidth = true,
  sx,
}) {
  const token = getCookie('session_key');

  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const seenIdsRef = useRef(new Set());
  const reqSeqRef = useRef(0);

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
    setSelected(null);
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }, []);

  const buildQuery = useCallback(
    (targetPage) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage || 1));
      params.set('limit', '20');
      params.set('userId', String(userId));

      if (status) params.set('status', String(status));

      return params.toString();
    },
    [userId, status]
  );

  const fetchPage = useCallback(
    async (targetPage) => {
      const seq = ++reqSeqRef.current;

      try {
        setLoading(true);
        setErrorText('');

        const url = `${CONFIG.apiUrl}/v1/admin/chats?${buildQuery(targetPage)}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (seq !== reqSeqRef.current) return;
        if (!json?.success) throw new Error(json?.message || json?.msg || 'Request failed');

        const rows = json?.data?.chats || [];
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

  // Load chats when userId changes
  useEffect(() => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
      resetPaging();
      return;
    }

    resetPaging();
    fetchPage(1);
  }, [userId, resetPaging, fetchPage]);

  const handleLoadMoreClick = (e) => {
    e?.preventDefault?.();
    if (!loading && page < totalPages) fetchPage(page + 1);
  };

  // ---- UI helpers
  const getOtherParticipant = (chat) => {
    const uid = Number(userId);

    const p1 = chat?.participant1 || null;
    const p2 = chat?.participant2 || null;

    if (p1?.id === uid) return p2;
    if (p2?.id === uid) return p1;

    return p2 || p1;
  };

  const getAvatarUrl = (u) => {
    const av = u?.avatar || '';
    if (!av) return '';
    if (/^https?:\/\//i.test(String(av))) return String(av);

    let path = String(av).replaceAll('\\', '/').replace(/^\/+/, '');
    if (!path.startsWith('uploads/')) path = `uploads/avatar/user/${path}`;
    return `${String(CONFIG.assetsUrl || '').replace(/\/+$/, '')}/${path}`;
  };

  // . FIX 1: Primary label = ONLY the other person's name
  const getOptionPrimaryText = (chat) => {
    const other = getOtherParticipant(chat);
    return safeTrim(other?.full_name) || 'Unknown';
  };

  // . FIX 2: Put Chat ID in secondary line (optional)
  const getOptionSecondaryText = (chat) => {
    const other = getOtherParticipant(chat);
    const bits = [];

    // show chat id here instead of primary
    if (chat?.id) bits.push(` #${chat.id}`);

    if (other?.country) bits.push(other.country);

    return bits.join(' • ');
  };

  const getChatStatusText = (chat) => {
    const uid = Number(userId);

    if (chat?.participant_1_id === uid) return chat?.chat_status_p1 || '';
    if (chat?.participant_2_id === uid) return chat?.chat_status_p2 || '';
    return '';
  };

  const effectiveDisabled = disabled || !Number.isFinite(Number(userId)) || Number(userId) <= 0;

  return (
    <Autocomplete
      sx={sx}
      fullWidth={fullWidth}
      disabled={effectiveDisabled}
      loading={loading}
      options={options}
      value={selected}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      // . FIX 3: Selected value text (and input display) = ONLY name
      getOptionLabel={(opt) => {
        if (!opt) return '';
        if (opt.id === LOAD_MORE_KEY || opt.id === END_OF_LIST_KEY) return '';
        return getOptionPrimaryText(opt); // . only name now
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          try {
            onChatSelect && onChatSelect('', null);
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

        const uid = Number(userId);
        const otherUserId =
          Number(newVal?.participant_1_id) === uid
            ? Number(newVal?.participant_2_id)
            : Number(newVal?.participant_2_id) === uid
              ? Number(newVal?.participant_1_id)
              : Number(getOtherParticipant(newVal)?.id || 0) || null;

        try {
          // . only chatId + otherUserId
          onChatSelect && onChatSelect(newVal.id, otherUserId);
        } catch {
          /* ignore */
        }
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={
            errorText ||
            (effectiveDisabled
              ? 'Select a user first to load chats.'
              : 'Shows chats of selected user.')
          }
          error={Boolean(errorText)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
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
                  — End of list ({option?.total ?? 0} chats) —
                </Typography>
              </Box>
            </li>
          );
        }

        const other = getOtherParticipant(option);
        const statusText = getChatStatusText(option);

        return (
          <li {...props} key={option.id}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: 1,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Avatar
                src={getAvatarUrl(other)}
                alt={safeTrim(other?.full_name) || 'User'}
                sx={{ width: 44, height: 56, borderRadius: 1 }}
              />

              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {/* . FIX 4: dropdown main text = ONLY name */}
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {getOptionPrimaryText(option)}
                </Typography>

                {/* secondary line now includes Chat #id etc */}
                <Typography variant="caption" color="text.secondary" noWrap>
                  {getOptionSecondaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  Status (for user {userId}): {statusText || '—'}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}

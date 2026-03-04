'use client';

import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';

import { alpha } from '@mui/material/styles';
import {
  Box,
  Menu,
  Stack,
  Avatar,
  Button,
  Dialog,
  Tooltip,
  Divider,
  MenuItem,
  IconButton,
  Typography,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  DialogActions,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import {
  isSeen,
  probeUrl,
  bubbleSx,
  formatTime,
  getMediaKind,
} from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';




export default function AdminChatMessages({
  activeChat,
  messages = [],
  loading,
  hasMore,
  onLoadOlder,
  onDeleteMessage,
  getAvatarUrl,
  buildFileCandidates,
}) {
  const router = useRouter();

  const scrollRef = useRef(null);
  const msgRefs = useRef({});
  const highlightTimerRef = useRef(null);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [highlightMsgId, setHighlightMsgId] = useState(null);

  const [mediaPreview, setMediaPreview] = useState({
    open: false,
    url: '',
    kind: 'image',
    title: '',
  });

  const [resolvedUrls, setResolvedUrls] = useState({});
  const [msgMenu, setMsgMenu] = useState({ open: false, anchorEl: null, message: null });

  const activeP1 = activeChat?.participant1 || null;
  const activeP2 = activeChat?.participant2 || null;

  const senderNameById = (userId) => {
    if (!activeChat) return 'Unknown';
    if (userId === activeChat.participant_1_id) return activeP1?.full_name || `User #${userId}`;
    if (userId === activeChat.participant_2_id) return activeP2?.full_name || `User #${userId}`;
    return userId ? `User #${userId}` : 'Unknown';
  };

  const senderAvatar = (m) => {
    if (!activeChat) return '';
    if (m?.sender_id === activeChat.participant_1_id) return getAvatarUrl?.(activeP1) || '';
    if (m?.sender_id === activeChat.participant_2_id) return getAvatarUrl?.(activeP2) || '';
    return '';
  };

  const clearHighlightLater = () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightMsgId(null), 1400);
  };

  const scrollToMessage = (messageId) => {
    const el = msgRefs.current?.[messageId];
    if (!el) return toast.info('Original message is not loaded in the current view.');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightMsgId(messageId);
    clearHighlightLater();
  };
const copyToClipboard = useCallback(async (text) => {
  try {
    if (!text) return false;

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);

    return true;
  } catch {
    return false;
  }
}, []);
  const resolveFileUrl = useCallback(
    async (file) => {
      const fid = String(file?.id || '');
      if (!fid) return null;

      const cached = resolvedUrls?.[fid];
      if (cached?.status === 'ok' && cached?.url) return cached.url;
      if (cached?.status === 'loading') return cached?.url || null;

      setResolvedUrls((p) => ({ ...p, [fid]: { url: p?.[fid]?.url || '', status: 'loading' } }));

      const kind = getMediaKind(file);
      const candidates = buildFileCandidates?.(file) || [];

      for (const u of candidates) {
        const ok = await probeUrl(u, kind);
        if (ok) {
          setResolvedUrls((p) => ({ ...p, [fid]: { url: u, status: 'ok' } }));
          return u;
        }
      }

      const fallback = candidates?.[0] || '';
      setResolvedUrls((p) => ({ ...p, [fid]: { url: fallback, status: 'fail' } }));
      return fallback || null;
    },
    [resolvedUrls, buildFileCandidates]
  );

  const openMediaPreview = async (file) => {
    const url = await resolveFileUrl(file);
    if (!url) return toast.error('Media URL not available');

    const kind = getMediaKind(file);
    if (kind !== 'image' && kind !== 'video') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setMediaPreview({
      open: true,
      url,
      kind,
      title: file?.name ? String(file.name) : 'Attachment',
    });
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!loading && messages?.length) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 60);
    }
  }, [loading, messages?.length]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    []
  );

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    desc: '',
    onConfirm: null,
    danger: false,
    confirmText: 'Confirm',
  });

  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false, onConfirm: null }));

  const openConfirm = ({ title, desc, onConfirm, danger = false, confirmText = 'Confirm' }) => {
    setConfirmDialog({ open: true, title, desc, onConfirm, danger, confirmText });
  };

  const confirmDeleteMessage = (m) => {
    if (!m?.id) return;

    const who = senderNameById(m.sender_id);
    const preview =
      m?.message_type && m.message_type !== 'text'
        ? `[${String(m.message_type || 'file').toUpperCase()}] ${m.message || ''}`
        : String(m?.message || '');

    openConfirm({
      title: 'Delete this message?',
      desc: `${who}: ${preview ? preview.slice(0, 120) : '—'}`,
      danger: true,
      confirmText: 'Delete',
      onConfirm: async () => onDeleteMessage?.(m.id),
    });
  };

  const openMsgMenu = (e, m) => {
    e.preventDefault();
    e.stopPropagation();
    setMsgMenu({ open: true, anchorEl: e.currentTarget, message: m });
  };
  const closeMsgMenu = () => setMsgMenu({ open: false, anchorEl: null, message: null });

  const handleCopyMessageId = async (m) => {
    const ok = await copyToClipboard(String(m?.id ?? ''));
    if (ok) toast.success('Message ID copied');
    else toast.error('Failed to copy');
  };

  const handleGoToCoinSpent = (m) => {
    const messageId = m?.id ? String(m.id) : '';
    if (!messageId) return toast.error('Message id not available');

    const target =
      paths.dashboard?.coinPackages?.spentTransactions || '/dashboard/transaction/coin-transaction';

    router.push(`${target}?message_id=${encodeURIComponent(messageId)}`);
  };

  const renderAttachments = (m, alignRight) => {
    const files = Array.isArray(m?.messageFiles) ? m.messageFiles : [];
    if (!files.length) return null;

    return (
      <Stack sx={{ mt: 1 }} spacing={1}>
        {files.map((f) => {
          const fid = String(f?.id || f?.name || Math.random());
          const kind = getMediaKind(f);

          const entry = f?.id ? resolvedUrls?.[String(f.id)] : null;
          const url =
            entry?.url ||
            buildFileCandidates?.(f)?.[0] ||
            (typeof f?.name === 'string' ? f.name : '');

          const isResolving = entry?.status === 'loading';

          if (kind === 'image') {
            return (
              <Box
                key={fid}
                sx={(theme) => ({
                  mt: 1,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                  bgcolor: alignRight
                    ? alpha(theme.palette.common.white, 0.12)
                    : alpha(theme.palette.common.black, 0.02),
                })}
              >
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={url}
                    alt={f?.name || 'image'}
                    sx={{
                      width: 320,
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                      cursor: 'pointer',
                      opacity: isResolving ? 0.55 : 1,
                    }}
                    onClick={() => openMediaPreview(f)}
                    onError={async () => resolveFileUrl(f)}
                  />
                  {isResolving && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircularProgress size={22} />
                    </Box>
                  )}
                </Box>

                <Box sx={{ px: 1.2, py: 0.9 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    🖼️ {f?.name || 'image'}
                  </Typography>
                </Box>
              </Box>
            );
          }

          if (kind === 'video') {
            return (
              <Box
                key={fid}
                sx={(theme) => ({
                  mt: 1,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                  bgcolor: alignRight
                    ? alpha(theme.palette.common.white, 0.12)
                    : alpha(theme.palette.common.black, 0.02),
                })}
              >
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="video"
                    src={url}
                    controls
                    preload="metadata"
                    sx={{
                      width: 380,
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                      opacity: isResolving ? 0.55 : 1,
                    }}
                    onClick={() => openMediaPreview(f)}
                    onError={async () => resolveFileUrl(f)}
                  />
                  {isResolving && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircularProgress size={22} />
                    </Box>
                  )}
                </Box>

                <Box sx={{ px: 1.2, py: 0.9 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    🎥 {f?.name || 'video'}
                  </Typography>
                </Box>
              </Box>
            );
          }

          return (
            <Box
              key={fid}
              sx={(theme) => ({
                mt: 1,
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                bgcolor: alignRight
                  ? alpha(theme.palette.common.white, 0.12)
                  : alpha(theme.palette.common.black, 0.02),
              })}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 1.2 }}
              >
                <Stack spacing={0.2}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    📎 {f?.name || 'file'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {f?.mime_type || f?.file_type || 'file'}
                    {typeof f?.size === 'number' ? ` • ${Math.round(f.size / 1024)} KB` : ''}
                  </Typography>
                </Stack>

                <Button size="small" variant="outlined" onClick={() => openMediaPreview(f)}>
                  Open
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box
      sx={(theme) => ({
        height: 'calc(100vh - 220px)',
        bgcolor: alpha(theme.palette.primary.main, 0.03),
        position: 'relative',
      })}
    >
      <Box ref={scrollRef} sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
        <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={!hasMore || loading}
            onClick={onLoadOlder}
            startIcon={<Iconify icon="mdi:arrow-up" />}
          >
            {hasMore ? 'Load older messages' : 'No more'}
          </Button>
        </Stack>

        {loading && messages.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
            <Typography variant="caption" sx={{ mt: 1 }} color="text.secondary">
              Loading messages…
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {messages.map((m) => {
              const alignRight = m?.sender_id === activeChat?.participant_2_id;
              const deleted = m?.status === 'deleted' || m?.is_deleted === true;
              const seen = isSeen(m);

              const senderName = senderNameById(m?.sender_id);
              const reply = m?.reply_to || null;
              const getMsgCreatedAt = m?.createdAt || m?.created_at || null;
              const myTime = formatTime(getMsgCreatedAt);

              return (
                <Box
                  key={m.id}
                  ref={(el) => {
                    if (el) msgRefs.current[m.id] = el;
                  }}
                  sx={(theme) => ({
                    width: '100%',
                    borderRadius: 1.6,
                    px: 1,
                    py: 0.6,
                    bgcolor:
                      highlightMsgId === m.id
                        ? alpha(theme.palette.success.main, 0.16)
                        : 'transparent',
                    transition: 'background-color .22s ease',
                  })}
                >
                  <Stack
                    direction="row"
                    justifyContent={alignRight ? 'flex-end' : 'flex-start'}
                    onMouseEnter={() => setHoveredMsgId(m.id)}
                    onMouseLeave={() => setHoveredMsgId((prev) => (prev === m.id ? null : prev))}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-end"
                      sx={{ maxWidth: '100%' }}
                    >
                      {!alignRight && (
                        <Avatar src={senderAvatar(m)} sx={{ width: 30, height: 30 }} />
                      )}

                      <Box sx={bubbleSx(alignRight, deleted)}>
                        {!deleted && (
                          <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                            <Tooltip title="More">
                              <IconButton
                                size="small"
                                onClick={(e) => openMsgMenu(e, m)}
                                sx={(theme) => ({
                                  opacity: hoveredMsgId === m.id ? 1 : 0,
                                  transition: 'opacity .15s ease',
                                  bgcolor: alignRight
                                    ? alpha(theme.palette.common.white, 0.22)
                                    : alpha(theme.palette.common.black, 0.06),
                                  '&:hover': {
                                    bgcolor: alignRight
                                      ? alpha(theme.palette.common.white, 0.3)
                                      : alpha(theme.palette.common.black, 0.1),
                                  },
                                })}
                              >
                                <Iconify icon="mdi:dots-vertical" width={18} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            display: 'block',
                            mb: 0.6,
                            pr: 9,
                            color: alignRight
                              ? (theme) => alpha(theme.palette.common.white, 0.94)
                              : (theme) => alpha(theme.palette.primary.main, 0.9),
                          }}
                          noWrap
                        >
                          {senderName}
                        </Typography>

                        {!!reply && (
                          <Box
                            role="button"
                            tabIndex={0}
                            sx={(theme) => ({
                              mb: 1,
                              p: 1,
                              borderRadius: 1.7,
                              bgcolor: alignRight
                                ? alpha(theme.palette.common.white, 0.18)
                                : alpha(theme.palette.primary.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                              cursor: 'pointer',
                            })}
                            onClick={() => scrollToMessage(reply?.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') scrollToMessage(reply?.id);
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                              {reply?.sender_id ? senderNameById(reply.sender_id) : '—'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {reply?.message ? String(reply.message) : '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                              {formatTime(reply?.createdAt || reply?.created_at)}
                            </Typography>
                          </Box>
                        )}

                        {!!m?.message && (
                          <Typography variant="body2" sx={{ pr: 7 }}>
                            {m?.message_type && m.message_type !== 'text'
                              ? `[${String(m.message_type).toUpperCase()}] ${m.message || ''}`
                              : m.message}
                          </Typography>
                        )}

                        {!deleted && renderAttachments(m, alignRight)}

                        <Box
                          sx={{
                            position: 'absolute',
                            right: 10,
                            bottom: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            userSelect: 'none',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ opacity: alignRight ? 0.92 : 0.68, lineHeight: 1 }}
                          >
                            {myTime}
                          </Typography>

                          {alignRight && !deleted && (
                            <Box
                              sx={(theme) => ({
                                display: 'inline-flex',
                                alignItems: 'center',
                                opacity: 0.95,
                                color: seen
                                  ? alpha(theme.palette.common.white, 0.95)
                                  : alpha(theme.palette.common.white, 0.85),
                              })}
                            >
                              <Iconify icon={seen ? 'mdi:check-all' : 'mdi:check'} width={16} />
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {alignRight && (
                        <Avatar src={senderAvatar(m)} sx={{ width: 30, height: 30 }} />
                      )}
                    </Stack>
                  </Stack>
                </Box>
              );
            })}

            {messages.length === 0 && !loading && (
              <Stack alignItems="center" sx={{ py: 10 }}>
                <Iconify icon="mdi:message-processing-outline" width={40} />
                <Typography sx={{ mt: 1 }} color="text.secondary">
                  No messages in this chat
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
      </Box>

      {/* MESSAGE MENU */}
      <Menu
        open={msgMenu.open}
        anchorEl={msgMenu.anchorEl}
        onClose={closeMsgMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: (theme) => ({
            borderRadius: 2,
            mt: 0.5,
            minWidth: 230,
            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          }),
        }}
      >
        <MenuItem
          onClick={async () => {
            const m = msgMenu.message;
            closeMsgMenu();
            if (!m?.id) return toast.error('Message id not available');
            await handleCopyMessageId(m);
          }}
        >
          <ListItemIcon>
            <Iconify icon="mdi:identifier" width={18} />
          </ListItemIcon>
          <ListItemText primary="Copy message ID" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            const m = msgMenu.message;
            closeMsgMenu();
            if (!m?.id) return toast.error('Message not available');
            handleGoToCoinSpent(m);
          }}
        >
          <ListItemIcon>
            <Iconify icon="mdi:cash-multiple" width={18} />
          </ListItemIcon>
          <ListItemText primary="See coin spent" />
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            const m = msgMenu.message;
            closeMsgMenu();
            if (!m?.id) return toast.error('Message not available');
            confirmDeleteMessage(m);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <Iconify icon="mdi:trash-can-outline" width={18} />
          </ListItemIcon>
          <ListItemText primary="Delete message" />
        </MenuItem>
      </Menu>

      {/* CONFIRM DIALOG */}
      <Dialog open={confirmDialog.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDialog.desc}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="outlined" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.danger ? 'error' : 'primary'}
            onClick={async () => {
              const fn = confirmDialog.onConfirm;
              closeConfirm();
              if (typeof fn === 'function') await fn();
            }}
          >
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MEDIA PREVIEW */}
      <Dialog
        open={mediaPreview.open}
        onClose={() => setMediaPreview({ open: false, url: '', kind: 'image', title: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>{mediaPreview.title || 'Preview'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {mediaPreview.kind === 'image' ? (
            <Box
              component="img"
              src={mediaPreview.url}
              alt="preview"
              sx={{ width: '100%', height: 'auto', borderRadius: 2, display: 'block' }}
            />
          ) : (
            <Box
              component="video"
              src={mediaPreview.url}
              controls
              autoPlay
              sx={{ width: '100%', height: 'auto', borderRadius: 2, display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => window.open(mediaPreview.url, '_blank', 'noopener,noreferrer')}
          >
            Open in new tab
          </Button>
          <Button
            variant="contained"
            onClick={() => setMediaPreview({ open: false, url: '', kind: 'image', title: '' })}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

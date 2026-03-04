'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Tab,
  Tabs,
  Chip,
  Card,
  Grid,
  Stack,
  Dialog,
  Button,
  Avatar,
  Divider,
  Tooltip,
  TextField,
  IconButton,
  Typography,
  Pagination,
  DialogTitle,
  ToggleButton,
  DialogActions,
  DialogContent,
  useMediaQuery,
  InputAdornment,
  CircularProgress,
  ToggleButtonGroup,
} from '@mui/material';

import { getCookie, formatFileSize } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// File type icons mapping
const FILE_TYPE_ICONS = {
  png: 'mdi:file-image',
  jpg: 'mdi:file-image',
  jpeg: 'mdi:file-image',
  webp: 'mdi:file-image',
  gif: 'mdi:file-image',
  pdf: 'mdi:file-pdf-box',
  doc: 'mdi:file-word',
  docx: 'mdi:file-word',
  xls: 'mdi:file-excel',
  xlsx: 'mdi:file-excel',
  csv: 'mdi:file-delimited',
  txt: 'mdi:file-document',
  rtf: 'mdi:file-document',
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function isImageFile(file) {
  return IMAGE_EXTENSIONS.includes(file.file_type?.toLowerCase());
}

function getFileUrl(file) {
  if (!file) return '';
  return `${CONFIG.assetsUrl}/${file.folders}/${file.name}`;
}

function isProbablyUrl(v) {
  if (!v) return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

// File Card Component
function FileCard({ file, isSelected, onSelect, showImportance = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isImage = isImageFile(file);
  const fileUrl = getFileUrl(file);

  return (
    <Card
      onClick={() => onSelect(file)}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        border: (theme) =>
          isSelected
            ? `${isMobile ? '2px' : '3px'} solid ${theme.palette.primary.main}`
            : `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s',
        '&:hover': {
          transform: isMobile ? 'none' : 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[isMobile ? 4 : 8],
        },
      }}
    >
      {/* Importance Badge */}
      {showImportance && file.importance === 'important' && (
        <Chip
          label="Important"
          size="small"
          color="error"
          sx={{
            position: 'absolute',
            top: { xs: 4, sm: 8 },
            left: { xs: 4, sm: 8 },
            zIndex: 2,
            fontWeight: 700,
            fontSize: { xs: 9, sm: 11 },
            height: { xs: 18, sm: 24 },
          }}
        />
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 4, sm: 8 },
            right: { xs: 4, sm: 8 },
            zIndex: 2,
            width: { xs: 24, sm: 32 },
            height: { xs: 24, sm: 32 },
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon="mdi:check" width={isMobile ? 16 : 20} color="white" />
        </Box>
      )}

      {/* Preview */}
      <Box
        sx={{
          aspectRatio: '1',
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isImage ? (
          <Box
            component="img"
            src={fileUrl}
            alt={file.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <Iconify
            icon={FILE_TYPE_ICONS[file.file_type] || 'mdi:file'}
            width={isMobile ? 48 : 64}
            color="text.secondary"
          />
        )}
      </Box>

      {/* Info */}
      <Box sx={{ p: { xs: 1, sm: 1.5 } }}>
        <Tooltip title={file.name}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 0.5,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            {file.name}
          </Typography>
        </Tooltip>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          <Chip
            label={file.file_type.toUpperCase()}
            size="small"
            variant="outlined"
            sx={{
              height: { xs: 16, sm: 20 },
              fontSize: { xs: 8, sm: 10 },
              '& .MuiChip-label': { px: { xs: 0.5, sm: 1 } },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
          >
            {formatFileSize(file.size)}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );
}

// Upload Tab Component
function UploadTab({ onFileUploaded }) {
  const session_key = getCookie('session_key');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importance, setImportance] = useState('normal');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('importance', importance);

      const res = await axios.post(`${CONFIG.apiUrl}/v1/admin/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session_key}`,
        },
        validateStatus: () => true,
      });

      const result = res.data;

      if (result?.success) {
        toast.success(result?.msg || 'File uploaded successfully');
        setSelectedFile(null);
        setImportance('normal');
        onFileUploaded?.(result.data);
      } else {
        toast.error(result?.msg || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Error while uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Drag & Drop Zone */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: (theme) =>
            isDragging
              ? `${isMobile ? '2px' : '3px'} dashed ${theme.palette.primary.main}`
              : `2px dashed ${theme.palette.divider}`,
          borderRadius: 2,
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          bgcolor: isDragging ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          hidden
          onChange={handleFileSelect}
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf"
        />

        <Stack alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
          <Box
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              borderRadius: '50%',
              bgcolor: 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon="mdi:cloud-upload" width={{ xs: 32, sm: 40 }} color="primary.main" />
          </Box>

          <Box>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
              {isDragging ? 'Drop file here' : 'Drag & drop file here'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              fontSize={{ xs: '0.75rem', sm: '0.875rem' }}
            >
              or click to browse
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            fontSize={{ xs: '0.65rem', sm: '0.75rem' }}
            sx={{ px: { xs: 1, sm: 0 } }}
          >
            Supported: Images (PNG, JPG, WEBP, GIF), PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, RTF
          </Typography>
        </Stack>
      </Box>

      {/* Selected File Info */}
      {selectedFile && (
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
            <Avatar
              sx={{
                width: { xs: 44, sm: 56 },
                height: { xs: 44, sm: 56 },
                bgcolor: 'primary.lighter',
              }}
            >
              <Iconify icon="mdi:file" width={{ xs: 24, sm: 28 }} color="primary.main" />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
                {selectedFile.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontSize={{ xs: '0.7rem', sm: '0.75rem' }}
              >
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>

            <IconButton size="small" onClick={() => setSelectedFile(null)} disabled={isUploading}>
              <Iconify icon="mdi:close" width={{ xs: 18, sm: 20 }} />
            </IconButton>
          </Stack>
        </Card>
      )}

      {/* Importance Toggle */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
          Importance
        </Typography>
        <ToggleButtonGroup
          value={importance}
          exclusive
          onChange={(e, newValue) => {
            if (newValue !== null) setImportance(newValue);
          }}
          fullWidth
          disabled={isUploading}
          size={isMobile ? 'small' : 'medium'}
        >
          <ToggleButton value="normal">
            <Iconify
              icon="mdi:flag-outline"
              width={{ xs: 16, sm: 20 }}
              sx={{ mr: { xs: 0.5, sm: 1 } }}
            />
            <Typography fontSize={{ xs: '0.75rem', sm: '0.875rem' }}>Normal</Typography>
          </ToggleButton>
          <ToggleButton value="important">
            <Iconify icon="mdi:flag" width={{ xs: 16, sm: 20 }} sx={{ mr: { xs: 0.5, sm: 1 } }} />
            <Typography fontSize={{ xs: '0.75rem', sm: '0.875rem' }}>Important</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Upload Button */}
      <Button
        variant="contained"
        size={isMobile ? 'medium' : 'large'}
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        startIcon={
          isUploading ? (
            <CircularProgress size={isMobile ? 16 : 20} color="inherit" />
          ) : (
            <Iconify icon="mdi:upload" width={{ xs: 18, sm: 20 }} />
          )
        }
        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </Button>
    </Stack>
  );
}

// Library Tab Component
function LibraryTab({ selectedFileId, onFileSelect }) {
  const session_key = getCookie('session_key');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');

  const fetchFiles = useCallback(
    async (pageNum = 1) => {
      setLoading(true);

      try {
        const params = {
          page: pageNum,
        };

        if (searchQuery.trim()) {
          params.q = searchQuery.trim();
        }

        if (fileTypeFilter !== 'all') {
          params.file_type = fileTypeFilter;
        }

        if (importanceFilter !== 'all') {
          params.importance = importanceFilter;
        }

        const res = await axios.get(`${CONFIG.apiUrl}/v1/admin/files`, {
          params,
          headers: {
            Authorization: `Bearer ${session_key}`,
          },
          validateStatus: () => true,
        });

        const result = res.data;

        if (result?.success) {
          setFiles(result.data.rows);
          setTotalPages(result.data.pagination.totalPages);
          setTotalRecords(result.data.pagination.totalRecords);
        } else {
          toast.error(result?.msg || 'Failed to fetch files');
        }
      } catch (err) {
        console.error('Fetch files error:', err);
        toast.error('Error while fetching files');
      } finally {
        setLoading(false);
      }
    },
    [session_key, searchQuery, fileTypeFilter, importanceFilter]
  );

  useEffect(() => {
    fetchFiles(page);
  }, [fetchFiles, page]);

  const handleSearch = () => {
    setPage(1);
    fetchFiles(1);
  };

  const handleFileTypeChange = (event, newValue) => {
    if (newValue !== null) {
      setFileTypeFilter(newValue);
      setPage(1);
    }
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Search & Filters */}
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        <TextField
          fullWidth
          placeholder="Search files by name, type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          size={isMobile ? 'small' : 'medium'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="mdi:magnify" width={{ xs: 18, sm: 20 }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                >
                  <Iconify icon="mdi:close" width={{ xs: 16, sm: 20 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            },
          }}
        />

        {/* File Type Filter */}
        <Box>
          <Typography variant="subtitle2" gutterBottom fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
            File Type
          </Typography>
          <ToggleButtonGroup
            value={fileTypeFilter}
            exclusive
            onChange={handleFileTypeChange}
            size="small"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 1 },
              '& .MuiToggleButton-root': {
                border: 1,
                borderColor: 'divider',
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minWidth: { xs: 'auto', sm: 'auto' },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="png">PNG</ToggleButton>
            <ToggleButton value="jpg">JPG</ToggleButton>
            <ToggleButton value="webp">WEBP</ToggleButton>
            <ToggleButton value="gif">GIF</ToggleButton>
            <ToggleButton value="pdf">PDF</ToggleButton>
            <ToggleButton value="docx">DOCX</ToggleButton>
            <ToggleButton value="xlsx">XLSX</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Importance Filter */}
        <Box>
          <Typography variant="subtitle2" gutterBottom fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
            Importance
          </Typography>
          <ToggleButtonGroup
            value={importanceFilter}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) {
                setImportanceFilter(newValue);
                setPage(1);
              }
            }}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                py: { xs: 0.5, sm: 0.75 },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="normal">Normal</ToggleButton>
            <ToggleButton value="important">Important</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Results Count */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            fontSize={{ xs: '0.75rem', sm: '0.875rem' }}
          >
            {totalRecords} file{totalRecords !== 1 ? 's' : ''} found
          </Typography>
          <Button
            size="small"
            startIcon={<Iconify icon="mdi:refresh" width={{ xs: 16, sm: 18 }} />}
            onClick={() => fetchFiles(page)}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Refresh
          </Button>
        </Box>
      </Stack>

      <Divider />

      {/* Files Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, sm: 8 } }}>
          <CircularProgress size={isMobile ? 32 : 40} />
        </Box>
      ) : files.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: { xs: 4, sm: 8 } }}>
          <Iconify
            icon="mdi:file-remove"
            width={{ xs: 48, sm: 64 }}
            color="text.disabled"
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" fontSize={{ xs: '1rem', sm: '1.25rem' }}>
            No files found
          </Typography>
          <Typography
            variant="body2"
            color="text.disabled"
            fontSize={{ xs: '0.75rem', sm: '0.875rem' }}
          >
            Try adjusting your filters or upload a new file
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {files.map((file) => (
              <Grid item xs={6} sm={4} md={3} key={file.id}>
                <FileCard
                  file={file}
                  isSelected={selectedFileId === file.id}
                  onSelect={onFileSelect}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 2, sm: 3 } }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                showFirstButton={!isMobile}
                showLastButton={!isMobile}
                size={isMobile ? 'small' : 'medium'}
                siblingCount={isMobile ? 0 : 1}
                boundaryCount={isMobile ? 1 : 1}
              />
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}

// URL Tab Component
function URLTab({ url, onUrlChange }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [inputUrl, setInputUrl] = useState(url || '');
  const [isValidUrl, setIsValidUrl] = useState(false);

  useEffect(() => {
    setIsValidUrl(isProbablyUrl(inputUrl));
  }, [inputUrl]);

  const handleApply = () => {
    if (isValidUrl) {
      onUrlChange(inputUrl);
      toast.success('External URL applied');
    }
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Box>
        <Typography variant="subtitle2" gutterBottom fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
          Enter External Image/File URL
        </Typography>
        <TextField
          fullWidth
          placeholder="https://example.com/image.png"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          error={inputUrl.length > 0 && !isValidUrl}
          helperText={
            inputUrl.length > 0 && !isValidUrl
              ? 'Please enter a valid URL (must start with http:// or https://)'
              : 'Enter the full URL of the image or file you want to use'
          }
          size={isMobile ? 'small' : 'medium'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="mdi:link" width={{ xs: 18, sm: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            },
            '& .MuiFormHelperText-root': {
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
            },
          }}
        />
      </Box>

      {/* URL Preview */}
      {isValidUrl && (
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle2" gutterBottom fontSize={{ xs: '0.8rem', sm: '0.875rem' }}>
            Preview
          </Typography>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxHeight: { xs: 200, sm: 300 },
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'background.neutral',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={inputUrl}
              alt="Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: { xs: 200, sm: 300 },
                objectFit: 'contain',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div style="padding: ${isMobile ? '20px' : '40px'}; text-align: center;">
                    <p style="color: #999; font-size: ${isMobile ? '14px' : '16px'};">Unable to load preview</p>
                    <p style="color: #999; font-size: ${isMobile ? '11px' : '12px'};">URL will be used as provided</p>
                  </div>
                `;
              }}
            />
          </Box>
        </Card>
      )}

      <Button
        variant="contained"
        size={isMobile ? 'medium' : 'large'}
        onClick={handleApply}
        disabled={!isValidUrl}
        startIcon={<Iconify icon="mdi:check" width={{ xs: 18, sm: 20 }} />}
        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
      >
        Use This URL
      </Button>
    </Stack>
  );
}

// Main Media Selector Dialog
export default function MediaSelectorDialog({ open, onClose, onSelect, selectedUrl = '' }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [currentTab, setCurrentTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [externalUrl, setExternalUrl] = useState(selectedUrl);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedUrl && isProbablyUrl(selectedUrl)) {
        // Check if it's from our system
        if (selectedUrl.includes('/uploads/')) {
          setCurrentTab(1); // Library tab
          // Try to extract and match file
        } else {
          setCurrentTab(2); // URL tab
          setExternalUrl(selectedUrl);
        }
      } else {
        setCurrentTab(0); // Upload tab
        setSelectedFile(null);
        setExternalUrl('');
      }
    }
  }, [open, selectedUrl]);

  const handleFileUploaded = (file) => {
    setSelectedFile(file);
    setCurrentTab(1); // Switch to library to show uploaded file
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (currentTab === 0) {
      // Upload tab - shouldn't reach here as upload auto-switches to library
      toast.error('Please upload a file first');
      return;
    }

    if (currentTab === 1) {
      // Library tab
      if (!selectedFile) {
        toast.error('Please select a file');
        return;
      }
      const fileUrl = getFileUrl(selectedFile);
      onSelect?.(fileUrl, selectedFile);
      onClose();
    }

    if (currentTab === 2) {
      // URL tab
      if (!isProbablyUrl(externalUrl)) {
        toast.error('Please enter a valid URL');
        return;
      }
      onSelect?.(externalUrl, null);
      onClose();
    }
  };

  const canConfirm =
    (currentTab === 1 && selectedFile) || (currentTab === 2 && isProbablyUrl(externalUrl));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: { xs: '100vh', md: '85vh' },
          borderRadius: { xs: 0, md: 2 },
          display: 'flex',
          flexDirection: 'column',
          m: { xs: 0, md: 2 },
        },
      }}
    >
      <DialogTitle sx={{ p: { xs: 1.5, sm: 2 }, pb: { xs: 0.5, sm: 1 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
            <Box
              sx={{
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: 1.5,
                bgcolor: 'primary.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify
                icon="solar:gallery-bold-duotone"
                width={{ xs: 22, sm: 28 }}
                color="primary.main"
              />
            </Box>
            <Box>
              <Typography
                variant={isMobile ? 'subtitle1' : 'h6'}
                lineHeight={1}
                fontSize={{ xs: '1rem', sm: '1.25rem' }}
              >
                Select Media
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontSize={{ xs: '0.7rem', sm: '0.75rem' }}
              >
                Manage and select your assets
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.disabled',
              p: { xs: 0.5, sm: 1 },
            }}
          >
            <Iconify icon="mdi:close" width={{ xs: 20, sm: 24 }} />
          </IconButton>
        </Stack>

        {/* Tabs integrated into the header for a cleaner look */}
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            mt: { xs: 1.5, sm: 2 },
            minHeight: { xs: 40, sm: 48 },
            '& .MuiTab-root': {
              px: { xs: 0.5, sm: 1 },
              minWidth: { xs: 'auto', sm: 100 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: 40, sm: 48 },
            },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: '1rem', sm: '1.25rem' },
            },
          }}
        >
          <Tab
            icon={<Iconify icon="solar:upload-minimalistic-bold-duotone" />}
            label={isMobile ? 'Upload' : 'Upload'}
            iconPosition="start"
          />
          <Tab
            icon={<Iconify icon="solar:folder-with-files-bold-duotone" />}
            label={isMobile ? 'Library' : 'Library'}
            iconPosition="start"
          />
          <Tab
            icon={<Iconify icon="solar:link-bold-duotone" />}
            label={isMobile ? 'URL' : 'External URL'}
            iconPosition="start"
          />
        </Tabs>
      </DialogTitle>

      <Divider />

      <DialogContent
        sx={{
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
          {currentTab === 0 && <UploadTab onFileUploaded={handleFileUploaded} />}
          {currentTab === 1 && (
            <LibraryTab selectedFileId={selectedFile?.id} onFileSelect={handleFileSelect} />
          )}
          {currentTab === 2 && <URLTab url={externalUrl} onUrlChange={setExternalUrl} />}
        </Box>
      </DialogContent>

      {/* Actions Section */}

      <DialogActions
        sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, bgcolor: 'background.paper' }}
      >
        {selectedFile && !isMobile && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" fontSize={{ xs: '0.75rem', sm: '0.875rem' }}>
              Selected:
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: { xs: 120, sm: 200 } }}
              fontSize={{ xs: '0.75rem', sm: '0.875rem' }}
            >
              {selectedFile.name}
            </Typography>
          </Stack>
        )}

        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          size={isMobile ? 'small' : 'medium'}
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!canConfirm}
          elevation={0}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            px: { xs: 2, sm: 4 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
          startIcon={<Iconify icon="solar:check-read-bold" width={{ xs: 16, sm: 20 }} />}
        >
          {isMobile ? 'Insert' : 'Insert Media'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

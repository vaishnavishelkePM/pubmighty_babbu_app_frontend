'use client';

import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';

import {
  Box,
  Chip,
  TextField,
  Typography,
  Autocomplete,
  InputAdornment,
  FormHelperText,
} from '@mui/material';

import { countries } from 'src/assets/data'; // [{ code:'AD', label:'Andorra', phone:'376' }, ...]

function Flag({ code, size = 22 }) {
  if (!code) return null;
  return (
    <ReactCountryFlag
      countryCode={String(code).toUpperCase()}
      svg
      title={code}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        lineHeight: '1',
      }}
    />
  );
}

/**
 * MultipleCountrySelector
 *
 * Props:
 * - label?, placeholder?
 * - multiple?: boolean (default true)
 * - maxSelections?: number (default 50)
 * - resetKey?: any
 *
 * Controlled inputs:
 * - valueCodes?: string[]        // ["IN","US"]
 * - valueCSV?: string            // "IN,US"
 *
 * Output:
 * - onCountriesSelect?: (codesArraySorted: string[], csvSorted: string) => void
 *
 * Notes:
 * - Always returns UPPERCASE unique sorted codes
 */
export default function MultipleCountrySelector({
  label = 'Countries',
  placeholder = 'Select countries…',

  multiple = true,
  maxSelections = 300,

  fullWidth = true,
  disabled = false,
  sx = {},

  resetKey = null,

  // controlled values (use one or both)
  valueCodes = [],
  valueCSV = '',

  // output
  onCountriesSelect,

  // optional: show phone in list
  showPhone = true,

  error = null,
}) {
  const options = React.useMemo(() => countries ?? [], []);

  // ADDED: Track last emitted value to prevent duplicate calls
  const lastEmittedRef = React.useRef('');

  // ---------- helpers ----------
  const normalizeCode = (c) =>
    String(c || '')
      .trim()
      .toUpperCase();

  const uniqueSorted = (arr) => {
    const cleaned = (arr || []).map(normalizeCode).filter(Boolean);
    const uniq = Array.from(new Set(cleaned));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  };

  const csvToArray = (csv) =>
    uniqueSorted(
      String(csv || '')
        .split(',')
        .map((s) => s.trim())
    );

  const arrayToCSV = (arr) => uniqueSorted(arr).join(',');

  // FIXED: Use stable memoization for controlled codes
  const controlledCodesKey = React.useMemo(() => {
    const fromArray = Array.isArray(valueCodes) ? valueCodes : [];
    const arr = fromArray.length ? fromArray : csvToArray(valueCSV);
    return uniqueSorted(arr).join(',');
  }, [JSON.stringify(valueCodes), valueCSV]);

  const controlledCodes = React.useMemo(
    () => controlledCodesKey.split(',').filter(Boolean),
    [controlledCodesKey]
  );

  // map codes -> option objects for Autocomplete value
  const selectedValue = React.useMemo(() => {
    if (multiple) {
      const set = new Set(controlledCodes);
      return options.filter((c) => c?.code && set.has(normalizeCode(c.code)));
    }
    const code = controlledCodes[0] || normalizeCode(valueCSV) || '';
    return options.find((c) => normalizeCode(c?.code) === normalizeCode(code)) ?? null;
  }, [multiple, controlledCodes, options, valueCSV]);

  const [internalValue, setInternalValue] = React.useState(selectedValue);
  const [helperText, setHelperText] = React.useState('');

  // keep internal in sync with controlled changes
  React.useEffect(() => {
    setInternalValue(selectedValue);
  }, [selectedValue]);

  // resetKey support
  React.useEffect(() => {
    if (resetKey == null) return;
    setInternalValue(multiple ? [] : null);
    setHelperText('');
    lastEmittedRef.current = ''; // ADDED: Reset last emitted
    onCountriesSelect?.([], '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // FIXED: Made emit stable with useCallback and deduplication
  const emit = React.useCallback(
    (codesArr) => {
      const sorted = uniqueSorted(codesArr);
      const csv = arrayToCSV(sorted);

      // Only emit if value actually changed
      if (lastEmittedRef.current !== csv) {
        lastEmittedRef.current = csv;
        onCountriesSelect?.(sorted, csv);
      }
    },
    [onCountriesSelect]
  );

  // ---------- UI helpers ----------
  const isOptionEqualToValue = (opt, val) => normalizeCode(opt?.code) === normalizeCode(val?.code);

  const getOptionLabel = (opt) => (opt?.label ? opt.label : '');

  const renderOption = (props, option, state) => {
    if (!option?.code) return null;
    const code = normalizeCode(option.code);
    return (
      <li {...props} key={`country-${code}`} style={{ padding: 0, marginTop: 6 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: 1.5,
            py: 1,
            px: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Flag code={code} size={20} />

          <Typography
            sx={{
              fontWeight: state.selected ? 700 : 500,
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {option.label}{' '}
            <Typography component="span" sx={{ fontWeight: 800 }}>
              {code}
            </Typography>
            {showPhone && option.phone ? (
              <Typography component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                (+{option.phone})
              </Typography>
            ) : null}
          </Typography>
        </Box>
      </li>
    );
  };

  const renderTags = (tagValue, getTagProps) =>
    tagValue.map((opt, index) => {
      const props = getTagProps({ index });
      const code = normalizeCode(opt?.code);
      return (
        <Chip
          {...props}
          key={`tag-${code}`}
          size="small"
          variant="outlined"
          label={code}
          avatar={<Flag code={code} size={18} />}
          sx={{
            borderRadius: '8px',
            '& .MuiChip-avatar': { width: 22, height: 22 },
          }}
        />
      );
    });

  const selectedSingle = multiple ? null : internalValue;

  return (
    <Box sx={{ width: '100%' }}>
      <Autocomplete
        multiple={multiple}
        options={options}
        value={internalValue}
        disabled={disabled}
        fullWidth={fullWidth}
        disableCloseOnSelect={!!multiple}
        filterSelectedOptions={!!multiple}
        autoHighlight={!multiple}
        isOptionEqualToValue={isOptionEqualToValue}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        renderTags={multiple ? renderTags : undefined}
        onChange={(_, newVal, reason) => {
          if (reason === 'clear' || !newVal) {
            setInternalValue(multiple ? [] : null);
            setHelperText('');
            emit([]);
            return;
          }

          if (multiple) {
            const arr = Array.isArray(newVal) ? newVal : [];
            const codes = arr.map((x) => normalizeCode(x?.code)).filter(Boolean);

            const sorted = uniqueSorted(codes);
            if (sorted.length > maxSelections) {
              setHelperText(`Max ${maxSelections} countries allowed`);
              // do NOT update selection
              return;
            }

            setHelperText('');
            setInternalValue(arr);
            emit(sorted);
          } else {
            const code = normalizeCode(newVal?.code);
            setHelperText('');
            setInternalValue(newVal);
            emit(code ? [code] : []);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={
              multiple
                ? Array.isArray(internalValue) && internalValue.length === 0
                  ? placeholder
                  : ''
                : placeholder
            }
            error={Boolean(error) || Boolean(helperText)}
            helperText={
              helperText ||
              error ||
              (multiple && Array.isArray(internalValue) && internalValue.length > 0
                ? `${internalValue.length} of ${maxSelections} selected`
                : '')
            }
            inputProps={{
              ...params.inputProps,
              autoComplete: 'new-password',
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment:
                !multiple && selectedSingle?.code ? (
                  <InputAdornment position="start">
                    <Flag code={selectedSingle.code} size={20} />
                  </InputAdornment>
                ) : (
                  params.InputProps?.startAdornment
                ),
            }}
          />
        )}
        sx={sx}
      />

      {(error || helperText) && !disabled ? (
        <FormHelperText error sx={{ mt: 0.5 }}>
          {helperText || error}
        </FormHelperText>
      ) : null}
    </Box>
  );
}

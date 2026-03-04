

'use client';

import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';

import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

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
 * CountrySelector
 *
 * Props:
 * - label?: string
 * - placeholder?: string
 * - multiple?: boolean                // default false
 * - fullWidth?: boolean               // default true
 * - disabled?: boolean
 * - sx?: SxProps
 *
 * When multiple === true  (CSV mode):
 * - valueCSV?: string                 // e.g., "IN, US"
 * - onChangeCSV?: (csv: string) => void
 *
 * When multiple === false (single code mode):
 * - valueCode?: string                // e.g., "IN"
 * - onChangeCode?: (code: string) => void
 */
export default function CountrySelector({
  label = 'Country',
  placeholder = 'Select country…',
  multiple = false,
  fullWidth = true,
  disabled = false,
  sx = {},
  valueCSV = '',
  onChangeCSV,
  valueCode = '',
  onChangeCode,
}) {
  const options = countries ?? [];

  // Helpers (CSV <-> array)
  const csvToArray = (csv) =>
    (csv || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

  const arrayToCSV = (arr) =>
    (arr || [])
      .map((s) =>
        String(s || '')
          .toUpperCase()
          .trim()
      )
      .filter(Boolean)
      .filter((s, i, a) => a.indexOf(s) === i)
      .join(', ');

  const selectedValue = React.useMemo(() => {
    if (multiple) {
      const set = new Set(csvToArray(valueCSV));
      return options.filter((c) => c?.code && set.has(String(c.code).toUpperCase()));
    }

    const v = String(valueCode || '')
      .trim()
      .toUpperCase();
    const found = options.find(
      (c) =>
        String(c?.code || '')
          .trim()
          .toUpperCase() === v
    );

    return found ?? null; // IMPORTANT: return null, not fake "Unknown object"
  }, [multiple, valueCSV, valueCode, options]);

  const isOptionEqualToValue = (opt, val) => opt?.code === val?.code;
  const getOptionLabel = (opt) =>
    opt?.label ? opt.label : opt?.code ? String(opt.code) : 'Unknown';

  const renderOption = (props, option) => {
    // Unknown option (virtual)
    if (!option?.code) {
      return (
        <li {...props} key="UNKNOWN_COUNTRY">
          <span style={{ fontSize: 18, lineHeight: 1 }}>🌍</span>
          <span style={{ marginLeft: 8 }}>Unknown</span>
        </li>
      );
    }

    return (
      <li {...props} key={option.code}>
        <Flag code={option.code} size={20} />
        <span style={{ marginLeft: 8 }}>
          {option.label} {option.code} (+{option.phone})
        </span>
      </li>
    );
  };

  const renderTags = (selected, getTagProps) =>
    selected.map((opt, index) => (
      <Chip
        {...getTagProps({ index })}
        key={opt.code}
        size="small"
        variant="outlined"
        label={opt.code}
        avatar={<Flag code={opt.code} size={18} />}
      />
    ));

  const handleChange = (e, newVal) => {
    if (multiple) {
      const codes = (Array.isArray(newVal) ? newVal : []).map((c) =>
        String(c.code || '').toUpperCase()
      );
      onChangeCSV?.(arrayToCSV(codes));
    } else {
      onChangeCode?.(newVal?.code ? String(newVal.code).toUpperCase() : '');
    }
  };

  const renderInput = (params) => {
    const sel = multiple ? null : selectedValue;
    const isUnknown = !multiple && !sel?.code;

    return (
      <TextField
        {...params}
        label={label}
        placeholder={isUnknown ? 'Unknown' : placeholder}
        InputProps={{
          ...params.InputProps,
          startAdornment: !multiple ? (
            <InputAdornment position="start">
              {isUnknown ? (
                <span style={{ fontSize: 18 }}>🌍</span>
              ) : (
                <Flag code={sel.code} size={20} />
              )}
            </InputAdornment>
          ) : (
            params.InputProps.startAdornment
          ),
        }}
      />
    );
  };

  return (
    <Autocomplete
      multiple={multiple}
      options={options}
      disableCloseOnSelect={!!multiple}
      filterSelectedOptions={!!multiple}
      autoHighlight={!multiple}
      value={selectedValue}
      onChange={handleChange}
      renderOption={renderOption}
      renderTags={multiple ? renderTags : undefined}
      renderInput={renderInput}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      fullWidth={fullWidth}
      disabled={disabled}
      sx={sx}
    />
  );
}

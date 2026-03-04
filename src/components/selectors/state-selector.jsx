'use client';

import { useMemo } from 'react';
import { State } from 'country-state-city';

import { Box, TextField, Typography, Autocomplete, FormHelperText } from '@mui/material';

export default function StateSelector({
  countryCode = '',
  value = '',
  onSelect,
  label = 'Select State',
  fullWidth = true,
  placeholder = 'Select state...',
  disabled = false,
  error = null,
}) {
  const stateOptions = useMemo(() => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map((state) => ({
      label: state.name,
      value: state.isoCode,
      ...state,
    }));
  }, [countryCode]);

  const selectedOption = stateOptions.find((opt) => opt.value === value) || null;

  return (
    <>
      <Autocomplete
        freeSolo
        fullWidth={fullWidth}
        disabled={disabled || !countryCode}
        options={stateOptions}
        value={selectedOption}
        getOptionLabel={(option) => {
          if (!option) return '';
          if (typeof option === 'string') return option;
          return option.label || '';
        }}
        onChange={(_, newValue) => {
          const stateValue =
            typeof newValue === 'string' ? newValue : newValue ? newValue.value : '';
          onSelect(stateValue);
        }}
        clearOnEscape
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <Box
              key={key}
              component="li"
              {...otherProps}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography>{option.label}</Typography>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            error={Boolean(error)}
          />
        )}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </>
  );
}

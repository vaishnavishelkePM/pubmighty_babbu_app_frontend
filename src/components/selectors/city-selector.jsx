'use client';

import { useMemo } from 'react';
import { City } from 'country-state-city';

import { Box, TextField, Typography, Autocomplete, FormHelperText } from '@mui/material';

export default function CitySelector({
  countryCode = '',
  stateCode = '',
  value = '',
  onSelect,
  label = 'Select City',
  fullWidth = true,
  placeholder = 'Select city...',
  disabled = false,
  error = null,
}) {
  const cityOptions = useMemo(() => {
    if (!countryCode || !stateCode) return [];
    return City.getCitiesOfState(countryCode, stateCode).map((city) => ({
      label: city.name,
      value: city.name,
      ...city,
    }));
  }, [countryCode, stateCode]);

  return (
    <>
      <Autocomplete
        freeSolo
        fullWidth={fullWidth}
        disabled={disabled || !countryCode || !stateCode}
        options={cityOptions}
        value={value || ''}
        getOptionLabel={(option) => {
          if (!option) return '';
          if (typeof option === 'string') return option;
          return option.label || '';
        }}
        onChange={(_, newValue) => {
          const cityValue =
            typeof newValue === 'string' ? newValue : newValue ? newValue.value : '';
          onSelect(cityValue);
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

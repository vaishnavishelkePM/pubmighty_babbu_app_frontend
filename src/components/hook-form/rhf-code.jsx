import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import OtpInput from 'react-otp-input';
import { FormHelperText, Box } from '@mui/material';

export default function RHFCode({ name, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <OtpInput
            value={field.value}
            onChange={field.onChange}
            numInputs={6}
            shouldAutoFocus
            isInputNum
            renderSeparator={<span style={{ width: 8 }}></span>}
            renderInput={(inputProps, idx) => (
              <input
                key={idx}
                {...inputProps}
                style={{
                  width: '44px',
                  height: '50px',
                  fontSize: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${error ? '#f44336' : '#ccc'}`,
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
            )}
            {...other}
          />

          {error && (
            <FormHelperText error sx={{ mt: 1 }}>
              {error.message}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}

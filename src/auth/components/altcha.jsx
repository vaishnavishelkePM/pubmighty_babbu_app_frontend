

'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

import { CONFIG } from 'src/global-config';

const Altcha = forwardRef(function Altcha(_, ref) {
  const widgetRef = useRef(null);
  const [value, setValue] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      get value() {
        return value;
      },
      reset() {
        setValue('');
        try {
          widgetRef.current?.reset?.();
        } catch (e) {}
      },
    }),
    [value]
  );

  useEffect(() => {
    import('altcha');

    const handleStateChange = (ev) => {
      const payload = ev?.detail?.payload;
      if (!payload) return;

      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      setValue(payloadStr);
    };

    const current = widgetRef.current;

    if (current) {
      current.addEventListener('statechange', handleStateChange);
      return () => current.removeEventListener('statechange', handleStateChange);
    }

    return undefined;
  }, []);

  return (
    <altcha-widget
      ref={widgetRef}
      style={{ '--altcha-max-width': '100%' }}
      challengeurl={`${CONFIG.apiUrl}/v1/admin/altcha-captcha-challenge`}
      hidelogo
      hidefooter
    />
  );
});

export default Altcha;

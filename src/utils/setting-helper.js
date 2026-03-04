import axios from 'axios';
import { toast } from 'react-toastify';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import {
  Box,
  Stack,
  Paper,
  Alert,
  Button,
  Dialog,
  Switch,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

export const SECTIONS = [
  { key: 'security', label: 'Security', icon: 'solar:shield-check-bold' },
  { key: 'auth', label: 'Auth / OTP', icon: 'solar:lock-password-bold' },
  { key: 'admin_pagination', label: 'Admin Pagination', icon: 'solar:list-bold' },
  { key: 'pagination', label: 'User Pagination', icon: 'solar:users-group-rounded-bold' },
  { key: 'files', label: 'Files', icon: 'solar:folder-with-files-bold' },
  { key: 'ads', label: 'Ads', icon: 'solar:ticket-bold' },

  { key: 'chat', label: 'Chat', icon: 'solar:chat-round-dots-bold' },
  { key: 'video_call', label: 'Video Call', icon: 'solar:videocamera-record-bold' },
  { key: 'limits', label: 'Limits', icon: 'solar:shield-warning-bold' },
  { key: 'app', label: 'App', icon: 'solar:settings-bold' },
  { key: 'rewards', label: 'Rewards/coins', icon: 'solar:star-bold' },

  { key: 'bot_matching', label: 'Bot ', icon: 'mdi:robot' },
  { key: 'notifications', label: 'Notifications', icon: 'solar:bell-bold' },
  { key: '2FA_setting', label: '2FA Settings', icon: 'solar:shield-check-bold' },
];

export const FIELD_DEFS = {
  security: [
    // Admin OTP
    {
      key: 'admin_otp_expires_login_minutes',
      label: 'Admin OTP Expires',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },
    {
      key: 'admin_otp_valid_minutes',
      label: 'Admin OTP Valid',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },

    // Admin Captcha
    {
      key: 'admin_login_captcha',
      label: 'Admin Login Captcha Type',
      type: 'select',
      options: [
        { value: 'recaptcha', label: 'reCAPTCHA' },
        { value: 'hcaptcha', label: 'hCaptcha' },
        { value: 'turnstile', label: 'Cloudflare Turnstile' },
        { value: 'altcha', label: 'Altcha' },
        { value: 'svg', label: 'SVG Image' },
      ],
    },

    {
      key: 'is_change_email_enable_admin',
      label: 'Allow Admin Change Email',
      type: 'bool',
      helper: 'If OFF, admin cannot change email in admin panel.',
    },

    {
      key: 'admin_login_captcha_enabled',
      label: 'Enable Admin Login Captcha',
      type: 'bool',
    },
    {
      key: 'admin_forgot_password_captcha',
      label: 'Admin Forgot Password Captcha Type',
      type: 'select',
      options: [
        { value: 'recaptcha', label: 'reCAPTCHA' },
        { value: 'hcaptcha', label: 'hCaptcha' },
        { value: 'turnstile', label: 'Cloudflare Turnstile' },
        { value: 'altcha', label: 'Altcha' },
        { value: 'svg', label: 'SVG Image' },
      ],
    },
    {
      key: 'admin_forgot_password_captcha_enabled',
      label: 'Enable Admin Forgot Password Captcha',
      type: 'bool',
    },

    // User Sessions
    {
      key: 'max_user_session_duration_days',
      label: 'Max User Session Duration',
      type: 'number',
      min: 1,
      max: 365,
      timeUnit: 'days',
    },
    {
      key: 'max_user_sessions',
      label: 'Max Concurrent User Sessions',
      type: 'number',
      min: 1,
      max: 100,
    },

    // Admin Sessions
    {
      key: 'max_admin_session_duration_days',
      label: 'Max Admin Session Duration',
      type: 'number',
      min: 1,
      max: 365,
      timeUnit: 'days',
    },
    {
      key: 'max_admin_sessions',
      label: 'Max Concurrent Admin Sessions',
      type: 'number',
      min: 1,
      max: 100,
    },

    // Captcha Enable Flags
    { key: 'is_recaptcha_enable', label: 'Enable reCAPTCHA', type: 'bool' },
    { key: 'is_hcaptcha_enable', label: 'Enable hCaptcha', type: 'bool' },
    { key: 'is_cloudflare_turnstile_enable', label: 'Enable Cloudflare Turnstile', type: 'bool' },
    { key: 'is_altcha_enable', label: 'Enable Altcha', type: 'bool' },
    { key: 'is_svg_image_enable', label: 'Enable SVG Image Captcha', type: 'bool' },

    // Captcha Keys
    { key: 'recaptcha_secret_key', label: 'reCAPTCHA Secret Key', type: 'text', secretLike: true },
    { key: 'recaptcha_client_key', label: 'reCAPTCHA Client Key', type: 'text' },
    { key: 'hcaptcha_secret_key', label: 'hCaptcha Secret Key', type: 'text', secretLike: true },
    { key: 'hcaptcha_client_key', label: 'hCaptcha Client Key', type: 'text' },
    {
      key: 'cloudflare_turnstile_secret_key',
      label: 'Turnstile Secret Key',
      type: 'text',
      secretLike: true,
    },
    { key: 'cloudflare_turnstile_client_key', label: 'Turnstile Client Key', type: 'text' },
    { key: 'altcha_captcha_key', label: 'Altcha Key', type: 'text', secretLike: true },
    {
      key: 'altcha_captcha_challenge_number',
      label: 'Altcha Challenge Number',
      type: 'number',
      min: 1,
      max: 10000000,
      helper: 'Controls difficulty/space. Keep sane.',
    },
  ],

  auth: [
    {
      key: 'verify_email',
      label: 'Verify Email (General)',
      type: 'bool',
      helper: 'General email verification flag.',
    },
    {
      key: 'verify_register_email',
      label: 'Verify Register Email',
      type: 'bool',
      helper: 'If enabled, email must be verified for registration flow.',
    },

    {
      key: 'register_otp_time_min',
      label: 'Register OTP Valid',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },
    {
      key: 'signup_otp_time_min',
      label: 'Signup OTP Valid',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },
    {
      key: 'login_otp_time_min',
      label: 'Login OTP Valid',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },
    {
      key: 'forgot_otp_time_min',
      label: 'Forgot OTP Valid',
      type: 'number',
      min: 1,
      max: 120,
      timeUnit: 'minutes',
    },
    {
      key: 'is_change_email_enabled',
      label: 'Enable User Change Email',
      type: 'bool',
      helper: 'If OFF, users cannot change their email from app.',
    },
  ],

  admin_pagination: [
    { key: 'admin_per_page', label: 'Admins Per Page', type: 'number', min: 1, max: 500 },
    { key: 'maxPages', label: 'Max Pages (General)', type: 'number', min: 1, max: 100000 },
    { key: 'max_pages_admin', label: 'Max Pages (Admin)', type: 'number', min: 1, max: 100000 },
    { key: 'bots_per_page_admin', label: 'Bots Per Page', type: 'number', min: 1, max: 500 },
    { key: 'users_per_page_admin', label: 'Users Per Page', type: 'number', min: 1, max: 500 },
    {
      key: 'coin_packages_per_page',
      label: 'Coin Packages Per Page',
      type: 'number',
      min: 1,
      max: 500,
    },
    {
      key: 'coin_purchase_tx_per_page',
      label: 'Coin Purchase Tx Per Page',
      type: 'number',
      min: 1,
      max: 500,
    },
    {
      key: 'default_per_page_notifications',
      label: 'Notifications Per Page',
      type: 'number',
      min: 1,
      max: 500,
    },
  ],

  pagination: [
    { key: 'max_pages_user', label: 'Max Pages (User)', type: 'number', min: 1, max: 100000 },
    { key: 'default_per_page_feed', label: 'Feed Per Page', type: 'number', min: 1, max: 500 },
    {
      key: 'total_maxpage_for_persons',
      label: 'Max Pages (Persons)',
      type: 'number',
      min: 1,
      max: 100000,
    },
    {
      key: 'default_per_page_persons',
      label: 'Persons Per Page',
      type: 'number',
      min: 1,
      max: 500,
    },
    {
      key: 'default_per_page_packages',
      label: 'Packages Per Page',
      type: 'number',
      min: 1,
      max: 500,
    },
    {
      key: 'default_total_page_packages',
      label: 'Total Max Pages (Packages)',
      type: 'number',
      min: 1,
      max: 100000,
    },
  ],

  bot_matching: [
    {
      key: 'bot_match_batch_size',
      label: 'Bot Match Batch Size',
      type: 'number',
      min: 1,
      max: 10000,
      helper: 'How many pending bot matches to process per run.',
    },
    {
      key: 'bot_match_delay_minutes',
      label: 'Bot Match Delay',
      type: 'number',
      min: 0,
      max: 10080,
      timeUnit: 'minutes',
      helper: 'Delay before bot match is processed.',
    },
    {
      key: 'bot_match_failed_retention_days',
      label: 'Failed Bot Match Retention',
      type: 'number',
      min: 0,
      max: 3650,
      timeUnit: 'days',
      helper: 'How long to keep failed match logs/records before cleanup.',
    },
    {
      key: 'bot_call_offline_minutes',
      label: 'Auto Bot Call Offline User',
      type: 'number',
      min: 0,
      max: 10080,
      default: 30,
      timeUnit: 'minutes',
      helper: 'Treat user as offline if inactive for this duration (0 = disable).',
    },
    {
      key: 'bot_call_batch_size',
      label: 'Bot Call Batch Size',
      type: 'number',
      min: 1,
      default: 50,
      max: 10000,
      helper: 'How many bot-call jobs to process per run.',
    },
    {
      key: 'bot_call_budget_ms',
      label: 'Bot Call Budget',
      type: 'number',
      min: 1000,
      max: 300000,
      default: 50000,
      timeUnit: 'ms',
      helper: 'Worker time budget per run.',
    },
  ],

  notifications: [
    {
      key: 'notification_batch_size',
      label: 'Notification Batch Size',
      type: 'number',
      min: 1,
      max: 10000,
      helper: 'How many notifications to send per run.',
    },
    {
      key: 'notification_stuck_minutes',
      label: 'Stuck Notification Threshold',
      type: 'number',
      min: 1,
      max: 10080,
      timeUnit: 'minutes',
      helper: 'If a notification is "processing" longer than this, treat it as stuck.',
    },
  ],

  files: [
    { key: 'max_files_per_user', label: 'Max Files Per User', type: 'number', min: 0, max: 10000 },
  ],

  ads: [
    { key: 'max_daily_ad_views', label: 'Max Daily Ad Views', type: 'number', min: 0, max: 10000 },

    {
      key: 'gap_between_ads',
      label: 'Gap Between Ads',
      type: 'number',
      min: 0,
      max: 86400,
      timeUnit: 'minutes',
      helper: 'User must wait this duration before watching the next ad.',
    },
    {
      key: 'ad_reset_minutes',
      label: 'Ad Reset Time',
      type: 'number',
      min: 1,
      max: 10080,
      timeUnit: 'minutes',
      helper: 'Ad limit window resets after this duration.',
    },
    { key: 'is_ad_enable', label: 'Enable Ads', type: 'bool' },

    {
      key: 'default_ad_provider_name',
      label: 'Default Ad Provider Name',
      type: 'select',
      options: [
        { value: 'admob', label: 'AdMob' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'unity', label: 'Unity' },
        { value: 'applovin', label: 'AppLovin' },
        { value: 'appodeal', label: 'Appodeal' },
      ],
      helper: 'Used when no provider range matches.',
    },

    {
      key: 'default_ad_target_value',
      label: 'Default Ad Target Value',
      type: 'number',
      min: 0,
      max: 1000000,
    },

    {
      key: 'adNetwork',
      label: 'Ad Network',
      type: 'select',
      options: [
        { value: 'admob', label: 'AdMob' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'unity', label: 'Unity' },
        { value: 'applovin', label: 'AppLovin' },
        { value: 'appodeal', label: 'Appodeal' },
      ],
      helper: 'Primary ad network to use.',
    },

    // ── Ad Type Controls ─────────────────────────────────
    {
      key: 'next_btn_ad_type',
      label: 'Next Button Ad Type',
      type: 'select',
      options: [
        { value: 'interstitial', label: 'Interstitial' },
        { value: 'video', label: 'Video' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      key: 'finish_btn_ad_type',
      label: 'Finish Button Ad Type',
      type: 'select',
      options: [
        { value: 'interstitial', label: 'Interstitial' },
        { value: 'video', label: 'Video' },
        { value: 'none', label: 'None' },
      ],
    },
    { key: 'is_ads_onfinish_btn_ad_type', label: 'Enable Ads on Finish Button', type: 'bool' },
    {
      key: 'interstitial_frequency_max',
      label: 'Max Interstitial Frequency',
      type: 'number',
      min: 0,
      max: 100,
    },
    { key: 'video_frequency_max', label: 'Max Video Frequency', type: 'number', min: 0, max: 100 },

    // ── AdMob ─────────────────────────────────────────────
    { key: 'admob_banner_ad_unit', label: 'AdMob Banner Ad Unit', type: 'text' },
    { key: 'admob_interstitial_ad_unit', label: 'AdMob Interstitial Ad Unit', type: 'text' },
    { key: 'admob_native_ad_unit', label: 'AdMob Native Ad Unit', type: 'text' },
    { key: 'admob_video_ad_unit', label: 'AdMob Video Ad Unit', type: 'text' },
    { key: 'admob_app_open_ad_unit', label: 'AdMob App Open Ad Unit', type: 'text' },

    // ── Facebook ──────────────────────────────────────────
    { key: 'fb_banner_ad_unit', label: 'Facebook Banner Ad Unit', type: 'text' },
    { key: 'fb_interstitial_ad_unit', label: 'Facebook Interstitial Ad Unit', type: 'text' },
    { key: 'fb_native_ad_unit', label: 'Facebook Native Ad Unit', type: 'text' },
    { key: 'fb_video_ad_unit', label: 'Facebook Video Ad Unit', type: 'text' },

    // ── Unity ─────────────────────────────────────────────
    { key: 'unity_game_id', label: 'Unity Game ID', type: 'text' },
    { key: 'unity_banner_ad_unit', label: 'Unity Banner Ad Unit', type: 'text' },
    { key: 'unity_interstitial_ad_unit', label: 'Unity Interstitial Ad Unit', type: 'text' },
    { key: 'unity_video_ad_unit', label: 'Unity Video Ad Unit', type: 'text' },

    // ── AppLovin ──────────────────────────────────────────
    { key: 'applovin_sdk_key', label: 'AppLovin SDK Key', type: 'text', secretLike: true },
    { key: 'applovin_banner_ad_unit', label: 'AppLovin Banner Ad Unit', type: 'text' },
    { key: 'applovin_interstitial_ad_unit', label: 'AppLovin Interstitial Ad Unit', type: 'text' },
    { key: 'applovin_native_ad_unit', label: 'AppLovin Native Ad Unit', type: 'text' },
    { key: 'applovin_video_ad_unit', label: 'AppLovin Video Ad Unit', type: 'text' },

    // ── Appodeal ──────────────────────────────────────────
    { key: 'appodeal_app_key', label: 'Appodeal App Key', type: 'text', secretLike: true },
    { key: 'appodeal_native_ad_unit', label: 'Appodeal Native Ad Unit', type: 'text' },
    { key: 'appodeal_video_ad_unit', label: 'Appodeal Video Ad Unit', type: 'text' },
  ],

  chat: [
    { key: 'max_chat_image_mb', label: 'Max Chat Image (MB)', type: 'number', min: 0, max: 5000 },
    { key: 'max_chat_audio_mb', label: 'Max Chat Audio (MB)', type: 'number', min: 0, max: 5000 },
    { key: 'max_chat_video_mb', label: 'Max Chat Video (MB)', type: 'number', min: 0, max: 10000 },
    { key: 'max_chat_file_mb', label: 'Max Chat File (MB)', type: 'number', min: 0, max: 10000 },
    {
      key: 'max_chat_files_per_message',
      label: 'Max Files Per Message',
      type: 'number',
      min: 0,
      max: 50,
    },
    { key: 'max_pinned_chats', label: 'Max Pinned Chats', type: 'number', min: 0, max: 100 },
    {
      key: 'cost_per_message',
      label: 'Cost Per Message (coins)',
      type: 'number',
      min: 0,
      max: 1000000,
    },
    {
      key: 'max_reply_time',
      label: 'Max Reply Time',
      type: 'number',
      min: 0,
      max: 3600,
      default: 8,
      timeUnit: 'seconds',
    },
    {
      key: 'min_reply_time',
      label: 'Min Reply Time',
      type: 'number',
      min: 0,
      max: 3600,
      default: 2,
      timeUnit: 'seconds',
    },
  ],

  video_call: [
    {
      key: 'video_call_cost_per_minute',
      label: 'Cost Per Minute (coins)',
      type: 'number',
      min: 0,
      max: 1000000,
    },
    {
      key: 'video_call_minimum_start_balance',
      label: 'Minimum Start Balance (coins)',
      type: 'number',
      min: 0,
      max: 1000000,
    },
    {
      key: 'min_call_wait',
      label: 'Minimum Call Wait Time',
      type: 'number',
      min: 0,
      max: 1000000,
      timeUnit: 'ms',
    },
    {
      key: 'max_call_wait',
      label: 'Maximum Call Wait Time',
      type: 'number',
      min: 0,
      max: 1000000,
      timeUnit: 'ms',
    },
    {
      key: 'call_end_auto',
      label: 'Call End Auto',
      type: 'number',
      min: 0,
      default: 0,
    },
    {
      key: 'loop_video_call',
      label: 'Loop Video Call',
      type: 'number',
      min: -1,
      max: 100000,
      default: -1,
    },
  ],

  limits: [
    {
      key: 'user_report_cooldown_seconds',
      label: 'Report Cooldown',
      type: 'number',
      min: 0,
      max: 86400,
      timeUnit: 'seconds',
    },
    {
      key: 'user_min_update_interval',
      label: 'User Min Update Interval',
      type: 'number',
      min: 1,
      max: 1440,
      timeUnit: 'minutes',
    },
    {
      key: 'admin_min_update_interval',
      label: 'Admin Min Update Interval',
      type: 'number',
      min: 1,
      max: 1440,
      timeUnit: 'minutes',
    },
  ],

  app: [
    { key: 'google_client_id', label: 'Google Client ID', type: 'text' },
    {
      key: 'compressQuality',
      label: 'Image Compress Quality (%)',
      type: 'number',
      min: 10,
      max: 100,
      helper: 'JPEG/WebP compression quality (10-100)',
    },
    { key: 'app_domain_name', label: 'App Domain Name', type: 'text' },
    {
      key: 'signup_rate_limit_mins',
      label: 'Signup Rate Limit',
      type: 'number',
      min: 1,
      max: 1440,
      timeUnit: 'minutes',
      helper: 'Rate limit window for signup.',
    },
    {
      key: 'is_user_facebook_login_enabled',
      label: 'Enable Facebook Login (Users)',
      type: 'bool',
      helper: 'If OFF, users cannot login with Facebook.',
    },
    {
      key: 'facebook_app_id',
      label: 'Facebook App ID',
      type: 'text',
      helper: 'Meta App ID used for Facebook login.',
    },
    {
      key: 'facebook_app_secret',
      label: 'Facebook App Secret',
      type: 'text',
      secretLike: true,
      helper: 'Hidden. Type a new value only if you want to replace it.',
    },
    { key: 'ga4_tracking_pera_name', label: 'GA4 Tracking Parameter Name', type: 'text' },
  ],

  rewards: [
    {
      key: 'signup_bonus_coins',
      label: 'Ad Signup Bonus Coins',
      type: 'number',
      min: 0,
      max: 1000000,
    },
    { key: 'ad_reward_coins', label: 'Ad Reward Coins', type: 'number', min: 0, max: 1000000 },
  ],

  '2FA_setting': [
    {
      key: 'is_app_twoFA_enable_on_admin_login',
      label: 'Enable Authenticator App 2FA (Admin Login)',
      type: 'twofa',
      twoFaType: 'app',
      helper: 'If ON, admin can use authenticator-app OTP.',
    },
    {
      key: 'is_email_twoFA_enable_on_admin_login',
      label: 'Enable Email OTP 2FA (Admin Login)',
      type: 'twofa',
      twoFaType: 'email',
      helper: 'If ON, admin can login using email OTP as 2FA.',
    },
  ],
};

//--------------------helpers to diaplay time in day/hours/min/sec .............
function toSeconds(val, unit) {
  const n = Number(val) || 0;
  switch (unit) {
    case 'ms':
      return n / 1000;
    case 'seconds':
      return n;
    case 'minutes':
      return n * 60;
    case 'hours':
      return n * 3600;
    case 'days':
      return n * 86400;
    default:
      return n;
  }
}

function fromSeconds(secs, unit) {
  switch (unit) {
    case 'ms':
      return Math.round(secs * 1000);
    case 'seconds':
      return Math.round(secs);
    case 'minutes':
      return Math.round(secs / 60);
    case 'hours':
      return Math.round(secs / 3600);
    case 'days':
      return Math.round(secs / 86400);
    default:
      return Math.round(secs);
  }
}

function secondsToParts(totalSecs) {
  const abs = Math.max(0, Math.round(totalSecs));
  return {
    d: Math.floor(abs / 86400),
    h: Math.floor((abs % 86400) / 3600),
    m: Math.floor((abs % 3600) / 60),
    s: abs % 60,
  };
}

function partsToSeconds({ d, h, m, s }) {
  return (
    (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
  );
}

function visibleParts(unit, max) {
  const maxSecs = max != null ? toSeconds(max, unit) : Infinity;
  const show = { d: false, h: false, m: false, s: false };
  if (maxSecs >= 86400 || maxSecs === Infinity) show.d = true;
  if (maxSecs >= 3600) show.h = true;
  if (maxSecs >= 60) show.m = true;
  if (unit === 'seconds' || unit === 'ms' || maxSecs < 60) show.s = true;
  if (!show.d && !show.h && !show.m && !show.s) show.m = true;
  return show;
}

function partsToString(parts, show) {
  const pieces = [];
  if (show.d) pieces.push(`${parts.d}d`);
  if (show.h) pieces.push(`${parts.h}h`);
  if (show.m) pieces.push(`${parts.m}m`);
  if (show.s) pieces.push(`${parts.s}s`);
  return pieces.join(' ');
}

function parseString(str, unit, show) {
  const trimmed = str.trim();

  const tokenRe = /(\d+)\s*(d|h|m|s)\b/gi;
  const parts = { d: 0, h: 0, m: 0, s: 0 };
  let matched = false;
  let mt;

  while ((mt = tokenRe.exec(trimmed)) !== null) {
    matched = true;
    const n = parseInt(mt[1], 10);
    switch (mt[2].toLowerCase()) {
      case 'd':
        parts.d = n;
        break;
      case 'h':
        parts.h = n;
        break;
      case 'm':
        parts.m = n;
        break;
      case 's':
        parts.s = n;
        break;
      default:
        break;
    }
  }
  if (matched) return parts;

  // Fallback: plain number → treat as raw value in the field's native unit
  const plain = parseFloat(trimmed);
  if (!Number.isNaN(plain)) {
    return secondsToParts(toSeconds(plain, unit));
  }

  return null;
}

export function DurationInput({
  value,
  onChange,
  unit = 'minutes',
  label,
  helperText,
  error,
  disabled,
  max,
}) {
  const show = useMemo(() => visibleParts(unit, max), [unit, max]);

  const partsFromValue = () => secondsToParts(toSeconds(value, unit));

  const [inputVal, setInputVal] = useState(() => partsToString(partsFromValue(), show));
  const [focused, setFocused] = useState(false);
  const prevValue = useRef(value);

  // Sync display when external value changes (but not while user is typing)
  useEffect(() => {
    if (!focused && value !== prevValue.current) {
      setInputVal(partsToString(partsFromValue(), show));
    }
    prevValue.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const handleChange = (e) => {
    const str = e.target.value;
    setInputVal(str);
    const parts = parseString(str, unit, show);
    if (parts) onChange(fromSeconds(partsToSeconds(parts), unit));
  };

  const handleBlur = () => {
    setFocused(false);
    const parts = parseString(inputVal, unit, show);
    if (parts) {
      setInputVal(partsToString(parts, show));
      onChange(fromSeconds(partsToSeconds(parts), unit));
    } else {
      setInputVal(partsToString(partsFromValue(), show));
    }
  };

  const placeholder = partsToString({ d: 0, h: 0, m: 0, s: 0 }, show);

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={inputVal}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      disabled={disabled}
      error={error}
      helperText={helperText || ' '}
      placeholder={placeholder}
    />
  );
}

// ─── OTP digit-box input ──────────────────────────────────────────────────────
export function OtpBoxInput({ value, onChange, disabled }) {
  const refs = useRef([]);

  const handleChange = (e, i) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = (value || '      ').split('');
    arr[i] = ch || ' ';
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace') {
      const arr = (value || '      ').split('');
      if (!arr[i]?.trim() && i > 0) {
        arr[i - 1] = ' ';
        onChange(arr.join(''));
        refs.current[i - 1]?.focus();
      } else {
        arr[i] = ' ';
        onChange(arr.join(''));
      }
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, ' '));
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const digits = (value || '      ').split('').slice(0, 6);

  return (
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ my: 2 }}>
      {digits.map((d, i) => (
        <TextField
          key={i}
          inputRef={(el) => {
            refs.current[i] = el;
          }}
          value={d.trim()}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          inputProps={{
            maxLength: 1,
            style: { textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '10px 0' },
          }}
          sx={{
            width: 48,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: d.trim() ? 'primary.lighter' : 'background.neutral',
              '& fieldset': {
                borderColor: d.trim() ? 'primary.main' : 'divider',
                borderWidth: d.trim() ? 2 : 1,
              },
            },
          }}
        />
      ))}
    </Stack>
  );
}

// ─── 2-step OTP dialog ────────────────────────────────────────────────────────
export function OtpDialog({
  open,
  onClose,
  twoFaType,
  targetValue,
  onVerified,
  baseUrl,
  session_key,
}) {
  const [step, setStep] = useState('confirm');
  const [otp, setOtp] = useState('      ');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(5);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open) {
      setStep('confirm');
      setOtp('      ');
      setError('');
      setSending(false);
      setVerifying(false);
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'otp') return undefined;
    setCountdown(expiresInMinutes * 60);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [step, expiresInMinutes]);

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');
  const expired = step === 'otp' && countdown === 0;

  const sendEndpoint =
    twoFaType === 'email'
      ? `${baseUrl}/settings/email-twofa-option/send-otp`
      : `${baseUrl}/settings/app-twofa-option/send-otp`;

  const verifyEndpoint =
    twoFaType === 'email'
      ? `${baseUrl}/settings/email-twofa-option/verify-otp`
      : `${baseUrl}/settings/app-twofa-option/verify-otp`;

  const doSendOtp = async () => {
    setSending(true);
    setError('');
    try {
      const res = await axios.post(
        sendEndpoint,
        { value: targetValue },
        {
          headers: { Authorization: `Bearer ${session_key}`, 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );
      if (res.data?.success) {
        setExpiresInMinutes(res.data.data?.expiresInMinutes ?? 5);
        setOtp('      ');
        setStep('otp');
      } else {
        setError(res.data?.msg || 'Failed to send OTP.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const doVerify = async () => {
    const clean = (otp || '').replace(/\s/g, '');
    if (clean.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const res = await axios.post(
        verifyEndpoint,
        { otp: clean },
        {
          headers: { Authorization: `Bearer ${session_key}`, 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );
      if (res.data?.success) {
        onVerified(res.data);
      } else {
        setError(res.data?.msg || 'Invalid OTP. Please try again.');
        setOtp('      ');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const typeLabel = twoFaType === 'email' ? 'Email OTP' : 'Authenticator App';
  const otpClean = (otp || '').replace(/\s/g, '');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="h6" component="div">
          {step === 'confirm' ? 'Confirm Change' : 'Enter OTP'}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Turn <strong>{typeLabel} 2FA</strong>{' '}
          <Box
            component="span"
            sx={{ fontWeight: 700, color: targetValue === 'on' ? 'success.main' : 'error.main' }}
          >
            {(targetValue || '').toUpperCase()}
          </Box>
        </Typography>
      </DialogTitle>

      <DialogContent>
        {step === 'confirm' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
              You are about to turn{' '}
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {typeLabel} 2FA
              </Box>{' '}
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  color: targetValue === 'on' ? 'success.main' : 'error.main',
                }}
              >
                {(targetValue || '').toUpperCase()}
              </Box>
              . An OTP will be sent to your admin email to confirm this change.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={doSendOtp}
              disabled={sending}
              startIcon={
                sending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:letter-bold" />
                )
              }
              sx={{ mb: 1.5 }}
            >
              {sending ? 'Sending OTP…' : 'Send OTP'}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={sending}
              sx={{ mb: 2 }}
            >
              Cancel
            </Button>
          </>
        )}

        {step === 'otp' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              A 6-digit OTP has been sent to your admin email. Enter it below to confirm.
            </Typography>

            <OtpBoxInput value={otp} onChange={setOtp} disabled={verifying || expired} />

            <Typography
              variant="caption"
              display="block"
              textAlign="center"
              sx={{ mb: 1.5, color: expired ? 'error.main' : 'text.secondary' }}
            >
              {expired ? (
                'OTP has expired.'
              ) : (
                <>
                  Expires in{' '}
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {mm}:{ss}
                  </Box>
                </>
              )}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={doVerify}
              disabled={otpClean.length !== 6 || verifying || expired}
              startIcon={
                verifying ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:check-circle-bold" />
                )
              }
              sx={{ mb: 1.5 }}
            >
              {verifying ? 'Verifying…' : 'Verify & Apply'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              sx={{ mb: 2 }}
              onClick={doSendOtp}
              disabled={sending || verifying}
              startIcon={
                sending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Iconify icon="solar:restart-bold" />
                )
              }
            >
              {sending ? 'Sending…' : 'Resend OTP'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 2FA toggle field ─────────────────────────────────────────────────────────
export function TwoFAToggleField({ fieldDef, currentValue, baseUrl, session_key }) {
  const [localValue, setLocalValue] = useState(currentValue || 'off');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(null);

  useEffect(() => {
    setLocalValue(currentValue || 'off');
  }, [currentValue]);

  const handleToggle = () => {
    const next = localValue === 'on' ? 'off' : 'on';
    setPendingValue(next);
    setDialogOpen(true);
  };

  const handleVerified = (data) => {
    setLocalValue(pendingValue);
    setDialogOpen(false);
    toast.success(data?.msg || '2FA setting updated successfully.');
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ minWidth: 0, pr: 2 }}>
          <Typography sx={{ fontWeight: 800 }} noWrap>
            {fieldDef.label}
          </Typography>
          {fieldDef.helper && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {fieldDef.helper}
            </Typography>
          )}
        </Box>
        <Switch checked={localValue === 'on'} onChange={handleToggle} color="primary" />
      </Paper>

      <OtpDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setPendingValue(null);
        }}
        twoFaType={fieldDef.twoFaType}
        targetValue={pendingValue}
        onVerified={handleVerified}
        baseUrl={baseUrl}
        session_key={session_key}
      />
    </>
  );
}

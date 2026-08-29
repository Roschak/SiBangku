// PRD §5, §100, §161-162: Platform Constants

export const TRIAL_DURATION_OPTIONS = [7, 14, 30, 60, 90] as const;
export const DEFAULT_TRIAL_DAYS = 60;
export const DEFAULT_GRACE_PERIOD_DAYS = 7;
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';
export const DEFAULT_CURRENCY = 'IDR';
export const DEFAULT_LANGUAGE = 'id';

export const SUPPORTED_CURRENCIES = ['IDR', 'USD', 'SGD', 'MYR'] as const;
export const SUPPORTED_LANGUAGES = ['id', 'en'] as const;

// PRD §35: Default Time Slot Config
export const DEFAULT_OPENING_TIME = '10:00';
export const DEFAULT_CLOSING_TIME = '22:00';
export const DEFAULT_SLOT_DURATION_MINUTES = 30;
export const DEFAULT_RESERVATION_DURATION_MINUTES = 120;
export const DEFAULT_BUFFER_TIME_MINUTES = 15;

// PRD §24: Image Validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// PRD §37: Default Menu Categories
export const DEFAULT_MENU_CATEGORIES = [
  'MAIN COURSE',
  'DRINKS',
  'DESSERT',
  'SNACK',
  'COFFEE',
  'SPECIAL',
] as const;

// PRD §89: Trial Warning Days
export const TRIAL_WARNING_DAYS = [7, 3, 1] as const;

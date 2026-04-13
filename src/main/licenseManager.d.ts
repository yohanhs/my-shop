export type LicenseCheckResponse =
  | { valid: true; expiresAt?: string; daysRemaining?: number }
  | { valid: false; reason: string; code?: 'SIGNATURE' | 'MACHINE' | 'EXPIRED' | 'CLOCK' | 'FILE' | 'KEY' };

export function verifyLicense(): Promise<LicenseCheckResponse>;

export function registerLicenseIpc(): void;

export function startLicenseMonitoring(): void;

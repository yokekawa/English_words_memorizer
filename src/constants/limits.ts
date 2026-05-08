/**
 * Soft cap on Google Cloud Vision API calls per calendar month, per device.
 * Acts purely as a safety net against runaway API spend if the app gets
 * unexpectedly heavy use; a typical learner takes a handful of photos per
 * month and never gets close to this.
 */
export const OCR_MONTHLY_LIMIT = 50;

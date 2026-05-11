/**
 * Free monthly OCR quota baked into the app. Users get this many calls per
 * calendar month without doing anything. Beyond this they can watch a rewarded
 * ad to add OCR_REWARD_PER_AD more calls — repeatable, with no upper bound:
 * every ad-funded scan is comfortably revenue-positive against Vision API
 * pricing, so capping the total would just leave money on the table while
 * frustrating heavy users.
 */
export const OCR_MONTHLY_BASE_LIMIT = 10;

/**
 * OCR calls granted per rewarded ad view. Triggered after the AdMob SDK fires
 * EARNED_REWARD, so the counter never advances without an actual ad view.
 */
export const OCR_REWARD_PER_AD = 5;

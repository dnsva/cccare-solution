import type { HrView } from './types';

/** Base text size for the participant app, in px (design range 16–28). */
export const PARTICIPANT_TEXT_SIZE = 19;

/** Switch the instructor screen to a dark theme while watching a live class. */
export const DARK_WHEN_LIVE = true;

/** Heart-rate layout an instructor sees first. */
export const DEFAULT_HR_VIEW: HrView = 'tiles';

/** Public ThingSpeak channel the Arduino uploads to. Field 1 is heart rate (bpm); field 2, if sent, is SpO₂ (%). */
export const THINGSPEAK_CHANNEL_ID = '3561813';

/** What staff see the sensor called, as in "Use live sensor oxi-1". */
export const THINGSPEAK_DEVICE = 'oxi-1';

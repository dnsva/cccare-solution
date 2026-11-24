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

/** Public ThingSpeak channel the pose-estimation camera uploads squat reps to. Fields are listed in lib/squatReps.ts. */
export const SQUAT_CHANNEL_ID = '3586580';

/**
 * Open the site with ?replay-squats to play the squat channel's past uploads, one every few seconds, as if
 * they were live. For checking the instructor view without the camera running.
 */
export const SQUAT_REPLAY = new URLSearchParams(window.location.search).has('replay-squats');

/** Who the squat camera is watching (p1 is Goosette). */
export const SQUAT_CAMERA_PARTICIPANT_ID = 'p1';

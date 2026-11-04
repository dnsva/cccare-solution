// Pretends to be the Arduino: POSTs a pulse-oximeter reading to the dev server every second.
// Use it to work on the live-sensor feature without the hardware.
//
//   npm run fake-sensor                       oxi-1 at about 95 bpm
//   npm run fake-sensor -- --bpm 150          high heart rate, to trigger an alert
//   npm run fake-sensor -- --no-finger        sensor on, no finger
//   npm run fake-sensor -- --device oxi-2 --url http://192.168.1.20:5173
//
// Stop it with Ctrl+C. The site shows "Sensor not sending" about 5 seconds later.

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const device = option('device', 'oxi-1');
const baseBpm = Number(option('bpm', '95'));
const url = option('url', 'http://localhost:5173').replace(/\/$/, '') + '/api/reading';
const finger = !args.includes('--no-finger');

if (!Number.isFinite(baseBpm)) {
  console.error('--bpm must be a number');
  process.exit(1);
}

let tick = 0;
let wasDown = false;

async function send() {
  tick += 1;
  const bpm = Math.round(baseBpm + Math.sin(tick * 0.6) * 3 + (Math.random() * 2 - 1));
  const spo2 = Math.round(97 + Math.sin(tick * 0.25));
  const body = finger
    ? new URLSearchParams({ device, bpm: String(bpm), spo2: String(spo2), finger: '1' })
    : new URLSearchParams({ device, finger: '0' });
  try {
    const res = await fetch(url, { method: 'POST', body });
    if (!res.ok) console.error(`Relay said ${res.status}: ${(await res.text()).trim()}`);
    else console.log(finger ? `${device}  ${bpm} bpm  SpO2 ${spo2}%` : `${device}  no finger`);
    if (wasDown) console.log('Reconnected.');
    wasDown = false;
  } catch {
    if (!wasDown) console.error(`Can't reach ${url}. Is \`npm run dev\` running?`);
    wasDown = true;
  }
}

console.log(`Sending ${device} to ${url} every second. Ctrl+C to stop.`);
send();
setInterval(send, 1000);

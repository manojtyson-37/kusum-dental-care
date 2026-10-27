const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01–12
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function to12Hour(h24) {
  const n = Number(h24);
  const period = n >= 12 ? 'PM' : 'AM';
  let h12 = n % 12;
  if (h12 === 0) h12 = 12;
  return { hour12: String(h12).padStart(2, '0'), period };
}

function to24Hour(hour12, period) {
  let n = Number(hour12) % 12;
  if (period === 'PM') n += 12;
  return String(n).padStart(2, '0');
}

// Native <input type="time"> renders an OS-drawn spinner we can't restyle
// or fix when it glitches (confirmed on macOS Chrome). Plain <select>s give
// full control and consistent behavior across browsers. Value/onChange stay
// in 24h "HH:MM" (what the backend expects); only the hour display is 12h.
export default function TimeSelect({ value, onChange, required, id }) {
  const [hour24 = '', minute = ''] = (value || '').split(':');
  const { hour12, period } = hour24 ? to12Hour(hour24) : { hour12: '', period: 'AM' };

  const minuteOptions = MINUTE_STEPS.includes(minute) || !minute
    ? MINUTE_STEPS
    : [minute, ...MINUTE_STEPS]; // preserve an existing off-grid value (legacy data) instead of silently changing it

  function setHour12(h) {
    onChange(`${to24Hour(h, period)}:${minute || '00'}`);
  }

  function setPeriod(p) {
    onChange(`${to24Hour(hour12 || '12', p)}:${minute || '00'}`);
  }

  function setMinute(m) {
    onChange(`${hour24 || '00'}:${m}`);
  }

  return (
    <div className="time-select" id={id}>
      <select value={hour12} onChange={(e) => setHour12(e.target.value)} required={required} aria-label="Hour">
        <option value="" disabled>HH</option>
        {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="time-select__sep">:</span>
      <select value={minute} onChange={(e) => setMinute(e.target.value)} required={required} aria-label="Minute">
        <option value="" disabled>MM</option>
        {minuteOptions.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={period} onChange={(e) => setPeriod(e.target.value)} required={required} aria-label="AM/PM">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

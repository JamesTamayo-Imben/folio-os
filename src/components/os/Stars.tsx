const STAR = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={filled ? "star on" : "star"}>
      <path d={STAR} strokeLinejoin="round" />
    </svg>
  );
}

/** Read-only star rating. Accepts decimals (for averages) and rounds to the nearest whole star for display. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const whole = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= whole} size={size} />
      ))}
    </span>
  );
}

/** Accessible star picker: a radio group of five buttons. */
export function StarInput({ value, onChange, describedBy, invalid }: { value: number; onChange: (n: number) => void; describedBy?: string; invalid?: boolean }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Your rating" aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="star-btn" onClick={() => onChange(n)}>
          <Star filled={n <= value} size={28} />
        </button>
      ))}
    </div>
  );
}

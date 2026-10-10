import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CloudOff, Loader2, RefreshCw, X } from 'lucide-react';
import { PRIORITY_TONE, STATUS_TONE, TONE_COLOR } from '../lib/constants.js';

/* ---------------------------------------------------------------- buttons */
export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin" aria-hidden="true" />;
}

export function Button({ variant = 'primary', size, loading = false, children, className = '', disabled, ...rest }) {
  const classes = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', className].filter(Boolean).join(' ');
  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- fields */
function FieldShell({ id, label, error, hint, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && !error && <span className="muted" style={{ fontSize: 13 }}>{hint}</span>}
      {error && (
        <span className="field-error" id={`${id}-error`} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function TextField({ label, error, hint, icon: Icon, trailing, className = '', ...rest }) {
  const id = useId();
  const input = (
    <input
      id={id}
      className={`input ${error ? 'invalid' : ''} ${className}`}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...rest}
    />
  );
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {Icon || trailing ? (
        <div className={`input-wrap ${trailing ? 'has-reveal' : ''}`}>
          {Icon && <Icon size={18} aria-hidden="true" />}
          {input}
          {trailing}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export function TextArea({ label, error, hint, ...rest }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        className={`textarea ${error ? 'invalid' : ''}`}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ label, error, options, placeholder, small = false, ...rest }) {
  const id = useId();
  const select = (
    <select
      id={id}
      className={`select ${small ? 'select-sm' : ''} ${error ? 'invalid' : ''}`}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      aria-label={label ? undefined : rest['aria-label']}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  return small ? select : <FieldShell id={id} label={label} error={error}>{select}</FieldShell>;
}

/** Radio-style segmented control with an animated sliding pill. */
export function Segmented({ label, options, value, onChange, full = false }) {
  const group = useId();
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <div className={`seg ${full ? 'seg-full' : ''}`} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const checked = option === value;
          return (
            <button key={option} type="button" role="radio" aria-checked={checked} onClick={() => onChange(option)}>
              {checked && (
                <motion.span
                  layoutId={`seg-${group}`}
                  className="seg-pill"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                />
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ badges etc */
export function StatusBadge({ status }) {
  return <span className={`badge tone-${STATUS_TONE[status] || 'slate'}`}>{status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge tone-${PRIORITY_TONE[priority] || 'slate'}`}>{priority}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Progress">
      <motion.span initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

export function ProgressRing({ value, size = 150, stroke = 12, label, sublabel }) {
  const id = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${value}% complete`}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={TONE_COLOR.iris} />
            <stop offset="0.55" stopColor={TONE_COLOR.sky} />
            <stop offset="1" stopColor={TONE_COLOR.mint} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {(label !== undefined || sublabel) && (
        <div className="ring-label">
          <strong>{label}</strong>
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <motion.div className="card empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="empty-art">
        <Icon size={32} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry, retrying }) {
  const offline = error?.isNetwork;
  const Icon = offline ? CloudOff : AlertCircle;
  return (
    <div className="card empty" role="alert">
      <div className="empty-art" style={{ color: 'var(--flame)', borderColor: 'rgba(255,122,107,.4)' }}>
        <Icon size={32} aria-hidden="true" />
      </div>
      <h3>{offline ? 'You appear to be offline' : 'We couldn’t load this'}</h3>
      <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} loading={retrying}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */
const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, width }) {
  const panel = useRef(null);
  const titleId = useId();
  const lastFocus = useRef(null);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const target = panel.current?.querySelector('[data-autofocus], input, textarea, select') || panel.current;
      target?.focus();
    }, 60);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      lastFocus.current?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          onKeyDown={onKeyDown}
        >
          <motion.div
            ref={panel}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={width ? { width } : undefined}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="modal-head">
              <div>
                <h2 id={titleId}>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Delete', loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="440px">
      <p className="muted" style={{ marginBottom: 22 }}>{children}</p>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

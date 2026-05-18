import './Input.css';

export default function Input({
  label,
  id,
  error,
  hint,
  className = '',
  ...props
}) {
  const inputId = id || props.name;
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <input id={inputId} className="field__input" {...props} />
      {error && <span className="field__error">{error}</span>}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  );
}

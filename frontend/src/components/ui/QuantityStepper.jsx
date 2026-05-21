import './QuantityStepper.css';

export default function QuantityStepper({ value, min = 1, max = 99, onChange, disabled }) {
  return (
    <div className={`stepper ${disabled ? 'stepper--disabled' : ''}`}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="減少數量"
      >
        −
      </button>
      <span className="stepper__value">{value}</span>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="增加數量"
      >
        +
      </button>
    </div>
  );
}

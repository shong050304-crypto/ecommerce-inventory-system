import './StatCard.css';

export default function StatCard({ label, value, variant = 'default' }) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}

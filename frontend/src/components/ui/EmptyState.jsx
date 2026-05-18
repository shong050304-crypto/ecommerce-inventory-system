import { Link } from 'react-router-dom';
import Button from './Button';
import './EmptyState.css';

export default function EmptyState({ title, description, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 6h15l-1.5 9h-12L6 6z" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}

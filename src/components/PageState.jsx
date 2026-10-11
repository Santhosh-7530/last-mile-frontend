export function LoadingState({ label = 'Loading...' }) {
  return <div className="state-panel" role="status"><span className="spinner" />{label}</div>;
}

export function EmptyState({ title = 'No rides found.', detail }) {
  return <div className="state-panel state-empty"><span className="state-mark">–</span><h3>{title}</h3>{detail && <p>{detail}</p>}</div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="state-panel state-error" role="alert"><div><strong>{message}</strong><p>Please check your connection and try again.</p></div>{onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button>}</div>;
}
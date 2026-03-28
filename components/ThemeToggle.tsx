interface Props {
  theme: 'light' | 'dark';
  onToggle: (t: 'light' | 'dark') => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <div className="theme-toggle-wrap">
      {(['light', 'dark'] as const).map(t => (
        <button
          type="button"
          key={t}
          className={`theme-btn ${theme === t ? 'active' : ''}`}
          onClick={() => onToggle(t)}
        >
          {t === 'light' ? '☀' : '☾'}
        </button>
      ))}
    </div>
  );
}

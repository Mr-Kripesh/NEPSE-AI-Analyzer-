interface Props {
  error: string;
  loading: boolean;
}

export default function ErrorBanner({ error, loading }: Props) {
  if (!error || loading) return null;
  return (
    <div className="error-banner">
      <span>⚠</span>
      <span>{error}</span>
    </div>
  );
}

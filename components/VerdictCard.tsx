import { vClass } from '@/lib/utils';

interface Props {
  verdict: string;
  reasoning: string;
}

export default function VerdictCard({ verdict, reasoning }: Props) {
  return (
    <div className={`verdict-card-new verdict-${vClass(verdict)}`}>
      <div className="verdict-left">
        <div className="verdict-big-label">AI Recommendation</div>
        <div className="verdict-big">{verdict}</div>
      </div>
      <div className="verdict-divider" />
      <div className="verdict-reasoning">{reasoning}</div>
    </div>
  );
}

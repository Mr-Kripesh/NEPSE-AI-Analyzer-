'use client';
import { useRef, useEffect } from 'react';

interface Props {
  riskLevel: string;
  riskScore: number;
}

export default function RiskMeter({ riskLevel, riskScore }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fillRef.current?.style.setProperty('--pct', `${Math.min(100, Math.max(0, riskScore || 50))}%`);
  }, [riskScore]);

  return (
    <div className="risk-meter-card">
      <div className="risk-meter-header">
        <span className="risk-meter-title">Risk Meter</span>
        <span className={`risk-badge-new ${riskLevel}`}>
          {riskLevel?.toUpperCase()} RISK — {riskScore}/100
        </span>
      </div>
      <div className="risk-track">
        <div
          ref={fillRef}
          className={`risk-fill ${riskLevel === 'low' ? 'low' : riskLevel === 'high' ? 'high' : 'med'}`}
        />
      </div>
      <div className="risk-track-labels">
        <span>🟢 Low</span><span>🟡 Medium</span><span>🔴 High</span>
      </div>
    </div>
  );
}

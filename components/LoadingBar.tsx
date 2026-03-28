'use client';
import { useRef, useEffect } from 'react';

interface Props {
  show: boolean;
  loadMsg: string;
  loadPct: number;
}

export default function LoadingBar({ show, loadMsg, loadPct }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fillRef.current?.style.setProperty('--pct', `${loadPct}%`);
  }, [show, loadPct]);

  if (!show) return null;
  return (
    <div className="loading-wrap">
      <div className="loading-bar-track">
        <div ref={fillRef} className="loading-bar-fill" />
      </div>
      <div className="loading-msg">{loadMsg}</div>
    </div>
  );
}

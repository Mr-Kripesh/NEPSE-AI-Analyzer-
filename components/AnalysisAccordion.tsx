import { SECTIONS } from '@/lib/constants';

interface Props {
  sections: Record<string, string>;
  activeSection: string | null;
  onSectionToggle: (key: string | null) => void;
}

export default function AnalysisAccordion({ sections, activeSection, onSectionToggle }: Props) {
  return (
    <>
      <div className="analysis-sections">
        {SECTIONS.map(s => (
          <div key={s.key} className={`analysis-item ${activeSection === s.key ? 'open' : ''}`}>
            <button
              type="button"
              className="analysis-item-header"
              onClick={() => onSectionToggle(activeSection === s.key ? null : s.key)}
            >
              <span className="analysis-item-icon">{s.icon}</span>
              <span className="analysis-item-title">{s.title}</span>
              <span className="analysis-item-arrow">{activeSection === s.key ? '▲' : '▼'}</span>
            </button>
            {activeSection === s.key && (
              <div className="analysis-item-body">{sections?.[s.key] || '—'}</div>
            )}
          </div>
        ))}
      </div>
      <div className="expand-all-wrap">
        <button
          type="button"
          className="expand-all-btn"
          onClick={() => onSectionToggle(activeSection ? null : 'snapshot')}
        >
          {activeSection ? 'Collapse' : 'Expand All Sections'}
        </button>
      </div>
    </>
  );
}

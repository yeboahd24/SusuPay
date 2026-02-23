import { useState } from 'react';
import type { ValidationFlag } from '../../types/transaction';

interface ValidationFlagsProps {
  flags: ValidationFlag[];
}

export function ValidationFlags({ flags }: ValidationFlagsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!flags || flags.length === 0) return null;

  const passedCount = flags.filter((f) => f.passed).length;
  const summary = `${passedCount}/${flags.length} checks passed`;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {summary}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 pl-1">
          {flags.map((flag) => (
            <div key={flag.check} className="flex items-start gap-2 text-xs">
              {flag.passed ? (
                <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div>
                <span className="font-medium text-gray-700">{flag.check}</span>
                <span className="text-gray-500"> — {flag.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

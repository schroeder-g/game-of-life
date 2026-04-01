// @documentation-skip
import { useMemo, useState } from "react";
import { DOCUMENTATION_CONTENT } from "../data/documentation/_Documentation";

export const ClaimHint = ({ claimId }: { claimId: string }) => {
  const [showHint, setShowHint] = useState(false);
  const claim = useMemo(() => DOCUMENTATION_CONTENT.find(c => c.id === claimId), [claimId]);

  if (!claim) {
    return (
      <span style={{ color: 'red', marginRight: '4px', fontStyle: 'italic', textDecoration: 'none' }}>
        [{claimId}]
      </span>
    );
  }

  return (
    <span
      style={{ position: 'relative', marginRight: '4px' }}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      <a href={`#${claimId}`} onClick={e => e.preventDefault()} style={{ color: '#a5d6ff', textDecoration: 'none' }}>
        [{claimId}]
      </a>
      {showHint && (
        <div style={{ position: 'absolute', bottom: '120%', left: '0', backgroundColor: '#334', border: '1px solid #556', padding: '8px', borderRadius: '4px', zIndex: 10, width: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <p style={{ margin: 0, fontSize: '12px' }} dangerouslySetInnerHTML={{ __html: claim.text }} />
        </div>
      )}
    </span>
  );
};

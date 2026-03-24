import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT } from "../data/documentation";
import { MANUAL_TESTS } from "../data/manual-tests";
import { useClickOutside } from "../hooks/useClickOutside";
import { useManualTests } from "../hooks/useManualTests";

const claimTextMap = new Map<string, string>();
DOCUMENTATION_CONTENT.forEach(item => {
  // Remove HTML tags and deprecated notices for clean tooltip text
  const cleanText = item.text
    .replace(/<[^>]*>/g, '') // strip html tags
    .replace(/\[DEPRECATED[^\]]*\]\s*/, ''); // strip deprecated prefix
  claimTextMap.set(item.id, cleanText);
});

export function TestsPanel() {
  const { checkedTests, toggleTest } = useManualTests();
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useClickOutside(tooltipRef, (event) => {
    // Ignore clicks on the claim links themselves, as they have their own toggle logic.
    if ((event.target as HTMLElement).closest('.claim-link')) {
      return;
    }
    setActiveTooltip(null);
  });

  return (
    <>
      <div className="tests-panel glass-panel">
        <h3>Manual Tests</h3>
        {MANUAL_TESTS.map((test) => (
          <div key={test.id} className="test-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={checkedTests.has(test.id)}
              onChange={() => toggleTest(test.id)}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            />
            <span className="test-id" style={{ flexShrink: 0 }}>[{test.id}]</span>

            <div className="claim-links" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {test.claimIds.map((claimId) => (
                <span
                  key={claimId}
                  className="claim-link"
                  style={{ cursor: 'pointer', color: '#a5d6ff', textDecoration: 'underline dotted 1px' }}
                  onClick={(e) => {
                    if (activeTooltip && activeTooltip.id === claimId) {
                      setActiveTooltip(null); // Toggle off if clicking the same one
                    } else {
                      // Position the popup relative to the link
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setActiveTooltip({ id: claimId, x: rect.right + 5, y: rect.top });
                    }
                  }}
                >
                  {claimId}
                </span>
              ))}
            </div>

            <span onClick={() => toggleTest(test.id)} style={{ cursor: 'pointer', flex: 1, marginLeft: '4px' }}>
              {test.title}
            </span>
          </div>
        ))}
      </div>

      {isClient && activeTooltip && createPortal(
        <div
          ref={tooltipRef}
          className="tooltip-popup"
          style={{
            position: 'fixed',
            top: `${activeTooltip.y}px`,
            left: `${activeTooltip.x}px`,
            background: 'rgba(40, 40, 44, 0.97)',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '12px',
            maxWidth: '600px',
            zIndex: 1001,
          }}
        >
          {claimTextMap.get(activeTooltip.id)}
        </div>,
        document.body
      )}
    </>
  );
}

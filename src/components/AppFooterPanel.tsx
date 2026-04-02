import React from 'react';

export function AppFooterPanel() {
  return (
    <footer
      style={{
        height: '100px',
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '0.9rem',
        borderTop: '1px solid #333', // Subtle border at the top
        flexShrink: 0, // Prevent shrinking
      }}
    >
      <p>Copyright (c) 2026 Alex and David Goncalves</p>
    </footer>
  );
}

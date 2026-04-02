import React from 'react';

export function AppFooterPanel() {
  return (
    <footer
      style={{
        height: '50px',
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        margin: '2vh',
        display: 'flex',
        justifyContent: 'left',
        alignItems: 'center',
        fontSize: '0.9rem',
        borderTop: '1px solid #333', // Subtle border at the top
        flexShrink: 0, // Prevent shrinking
      }}
    >
      <p>Cube of Life Copyright (c) 2026 Alexander A. S. Gonçalves and David M. Gonçalves</p>
    </footer>
  );
}

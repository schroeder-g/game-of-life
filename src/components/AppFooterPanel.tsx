import React from 'react';

export function AppFooterPanel() {
  return (
    <footer
      style={{
        height: '100px', // Changed from 50px to 100px
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        // Removed margin: '2vh' to prevent pushing content
        display: 'flex',
        justifyContent: 'center', // Changed from 'left' to 'center'
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

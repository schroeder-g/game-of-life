import React from 'react';

interface AppFooterPanelProps {
  userName: string;
  buildInfo: {
    version: string;
    distribution: 'dev' | 'test' | 'prod';
    buildTime?: string;
  };
}

export function AppFooterPanel({ userName, buildInfo }: AppFooterPanelProps) {
  return (
    <footer
      style={{
        height: '100px', // Changed from 50px to 100px
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        // Removed margin: '2vh' to prevent pushing content
        display: 'flex',
        justifyContent: 'space-between', // Changed from 'left' to 'center'
        alignItems: 'center',
        fontSize: '0.9rem',
        borderTop: '1px solid #333', // Subtle border at the top
        flexShrink: 0, // Prevent shrinking
      }}
    >
      <p>Cube of Life © 2026 <br /> Alexander A. S. Gonçalves <br /> and David M. Gonçalves</p>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {userName && buildInfo.distribution !== "prod" && (
          <div className="user-welcome" style={{ marginRight: '8px' }}>Welcome, {userName}!</div>
        )}
        <div id="user-and-build" style={{ display: 'flex', alignItems: 'center' }}>
          <a>
            Build: {buildInfo.version}
            {buildInfo.distribution !== "prod" && buildInfo.buildTime
              ? ` @ ${new Date(buildInfo.buildTime).toLocaleString()}`
              : ""} ({buildInfo.distribution})
          </a>
        </div>
      </div>
    </footer>
  );
}

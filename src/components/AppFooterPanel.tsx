import React from 'react';

interface AppFooterPanelProps {
  userName: string;
  buildInfo: {
    version: string;
    distribution: 'dev' | 'test' | 'prod';
    buildTime?: string;
  };
}

// Helper function to format the build date and time
const formatBuildDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}.${month}.${day}.${hours}.${minutes}`;
};

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
              ? `.${formatBuildDateTime(buildInfo.buildTime)}`
              : ""} ({buildInfo.distribution})
          </a>
        </div>
      </div>
    </footer>
  );
}

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
        position: 'sticky',
        bottom: 0,
        marginTop: '-100px', // Pulls the footer up over the scene
        zIndex: 101,
        height: '100px',
        backgroundColor: 'rgba(26, 26, 26, 0.4)', // Translucent
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        fontSize: '0.8rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border
        flexShrink: 0,

      }}
    >
      <div style={{ color: '#4f5b66', lineHeight: '1.8' }}>
        Cube of Life © 2026<br />
        <span style={{ display: 'inline-block', marginTop: '6px' }}>Alexander and David Gonçalves</span>
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {userName && buildInfo.distribution !== "prod" && (
          <div className="user-welcome" style={{ marginRight: '8px' }}>Welcome, {userName}!</div>
        )}
        <div id="user-and-build" className="version-info" style={{ display: 'flex', alignItems: 'center',  fontSize: '0.8rem'}}>
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

import React, { useCallback } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/faceOrientationKeyMapping";

// Icon components for directional controls
const ArrowUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const ArrowFurtherIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const ArrowCloserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

interface FooterControlsProps {
  isSmallScreen: boolean;
}

export function FooterControls({ isSmallScreen }: FooterControlsProps) {
  const {
    state: { cameraOrientation },
    meta: { eventBus },
  } = useSimulation();

  const handleMove = useCallback((key: string) => {
    const face = cameraOrientation.face;
    const rotation = cameraOrientation.rotation;

    if (face === 'unknown' || rotation === 'unknown') {
      console.warn("Cannot move selector: camera orientation unknown.");
      return;
    }

    const mapping = KEY_MAP[face as CameraFace][rotation as CameraRotation];
    let delta: [number, number, number] = [0, 0, 0];

    switch (key) {
      case 'w': // Up
        delta = mapping.w as [number, number, number];
        break;
      case 's': // Down
        delta = mapping.s as [number, number, number];
        break;
      case 'a': // Left
        delta = mapping.a as [number, number, number];
        break;
      case 'd': // Right
        delta = mapping.d as [number, number, number];
        break;
      case 'q': // Further
        delta = mapping.q as [number, number, number];
        break;
      case 'z': // Closer
        delta = mapping.z as [number, number, number];
        break;
      default:
        return;
    }
    eventBus.emit('moveSelector', { delta });
  }, [cameraOrientation, eventBus]);

  if (!isSmallScreen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: 'var(--background-color)', // Assuming a CSS variable for background
      padding: '10px',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'auto auto auto',
        gap: '5px',
        maxWidth: '200px', // Limit width for better mobile display
      }}>
        <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('q')} style={{ width: '50px', height: '30px' }}><ArrowFurtherIcon /></button>
        </div>
        <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('a')} style={{ width: '50px', height: '30px' }}><ArrowLeftIcon /></button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('w')} style={{ width: '50px', height: '30px' }}><ArrowUpIcon /></button>
        </div>
        <div style={{ gridColumn: '3 / 4', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('d')} style={{ width: '50px', height: '30px' }}><ArrowRightIcon /></button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '3 / 4', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('s')} style={{ width: '50px', height: '30px' }}><ArrowDownIcon /></button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '4 / 5', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('z')} style={{ width: '50px', height: '30px' }}><ArrowCloserIcon /></button>
        </div>
      </div>
    </div>
  );
}

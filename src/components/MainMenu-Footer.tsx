import React, { useCallback } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/faceOrientationKeyMapping";

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
          <button className="glass-button" onClick={() => handleMove('q')} style={{ width: '50px', height: '30px' }}>F</button>
        </div>
        <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('a')} style={{ width: '50px', height: '30px' }}>L</button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('w')} style={{ width: '50px', height: '30px' }}>U</button>
        </div>
        <div style={{ gridColumn: '3 / 4', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('d')} style={{ width: '50px', height: '30px' }}>R</button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '3 / 4', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('s')} style={{ width: '50px', height: '30px' }}>D</button>
        </div>
        <div style={{ gridColumn: '2 / 3', gridRow: '4 / 5', display: 'flex', justifyContent: 'center' }}>
          <button className="glass-button" onClick={() => handleMove('z')} style={{ width: '50px', height: '30px' }}>C</button>
        </div>
      </div>
    </div>
  );
}

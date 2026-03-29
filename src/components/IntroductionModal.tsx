import React from 'react';
import { createPortal } from "react-dom";

interface IntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntroductionModal({ isOpen, onClose }: IntroductionModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    onClose();
  };

  return createPortal(
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to Cube of Life!</h2>
        <p>
          Explore a 3D adaptation of Conway's Game of Life. This cellular automaton
          simulates the evolution of cells on a 3D grid based on a set of simple rules.
        </p>
        <p>
          In **View Mode** (Projector Icon), you can observe the simulation's evolution,
          adjust its speed, and control playback.
        </p>
        <p>
          In **Edit Mode** (Pencil Icon), you can interact with the grid using various
          brush shapes and sizes. Paint cells alive or clear them, and even rotate
          the brush to create intricate patterns.
        </p>
        <p>
          Use the controls in the header to manage scenes, switch modes,
          control simulation playback, and adjust the camera view.
        </p>
        <button className="glass-button" onClick={handleClose}>
          Let's Go!
        </button>
      </div>
    </div>,
    document.body
  );
}

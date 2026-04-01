import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useSimulation } from "../contexts/SimulationContext"; // Keep useSimulation for buildInfo

// @documentation-skip
interface WelcomeModalProps {
  setShowIntroduction: (show: boolean) => void;
  setUserName: (name: string) => void;
}

export function WelcomeModal({ setShowIntroduction, setUserName }: WelcomeModalProps) {
  const {
    state: { buildInfo }, // Only need buildInfo from useSimulation now
  } = useSimulation();

  const [inputName, setInputName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("WelcomeModal: handleSubmit called. setUserName prop:", setUserName);
    if (inputName.trim()) {
      if (typeof setUserName === 'function') { // Defensive check
        setUserName(inputName.trim());
        setShowIntroduction(false); // Hide modal after setting name
      } else {
        console.error("WelcomeModal: setUserName is not a function! Received:", setUserName);
      }
    }
  };

  const handleClose = () => {
    setShowIntroduction(false); // Hide modal on close
  };

  return createPortal(
    <div className="modal-overlay welcome-modal" onClick={handleClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to Game of Life 3D</h2>
        <p>Distribution: {buildInfo.distribution}</p>
        <p>Build: {buildInfo.version}</p>

        <form onSubmit={handleSubmit} className="name-form">
          <label htmlFor="user-name">Please enter your name to continue:</label>
          <input
            id="user-name"
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Your Name"
            autoFocus
          />
          <button type="submit" className="glass-button primary" disabled={!inputName.trim()}>
            Start Testing
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}



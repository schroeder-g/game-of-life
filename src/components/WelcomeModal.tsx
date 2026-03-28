import React, { useState } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export function WelcomeModal() {
  const {
    state: { userName, buildInfo },
    actions: { setUserName },
  } = useSimulation();

  const [inputName, setInputName] = useState("");

  if (userName || buildInfo.distribution === "prod") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      setUserName(inputName.trim());
    }
  };

  return (
    <div className="modal-overlay welcome-modal">
      <div className="glass-panel modal-content">
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
    </div>
  );
}



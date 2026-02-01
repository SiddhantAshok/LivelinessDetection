// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import LivelinessDetector from './components/LivelinessDetector';
import Instructions from './components/Instructions';
import ProgressIndicator from './components/ProgressIndicator';

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState([]);

  const detectionSteps = [
    { id: 1, name: 'Smile', description: 'Show a natural smile' },
    { id: 2, name: 'Turn Head Right', description: 'Slowly turn your head to the right' },
    { id: 3, name: 'Turn Head Left', description: 'Slowly turn your head to the left' },
    { id: 4, name: 'Open Mouth', description: 'Keep your mouth open for 5 seconds' },
    { id: 5, name: 'Show 1 Finger', description: 'Show one finger to the camera' },
    { id: 6, name: 'Show 2 Fingers', description: 'Show two fingers to the camera' },
    { id: 7, name: 'Blink Eyes', description: 'Blink your eyes naturally' },
    { id: 8, name: 'Nod Head', description: 'Nod your head up and down' },
  ];

  const handleStepComplete = (stepId, success) => {
    setResults(prev => [...prev, { stepId, success, timestamp: new Date() }]);
    setCurrentStep(prev => prev + 1);
  };

  const handleCompleteAll = () => {
    setIsStarted(false);
    alert('All detection steps completed successfully!');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Liveliness Detection System</h1>
        <p>Complete all steps to verify your presence</p>
      </header>

      <main className="app-main">
        {!isStarted ? (
          <div className="start-screen">
            <h2>Welcome to Liveliness Detection</h2>
            <p className="subtitle">
              This system will guide you through several verification steps to ensure you are physically present.
            </p>

            <div className="steps-overview">
              <h3>Verification Steps:</h3>
              <ul>
                {detectionSteps.map(step => (
                  <li key={step.id}>
                    <span className="step-number">Step {step.id}:</span>
                    <span className="step-name">{step.name}</span>
                    <span className="step-desc"> - {step.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="start-button"
              onClick={() => setIsStarted(true)}
            >
              Start Verification
            </button>

            <Instructions />
          </div>
        ) : (
          <div className="verification-screen">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={detectionSteps.length}
              steps={detectionSteps}
              results={results}
            />

            <div className="camera-section">
              {currentStep < detectionSteps.length ? (
                <>
                  <div className="current-task">
                    <h3>Current Task: {detectionSteps[currentStep].name}</h3>
                    <p>{detectionSteps[currentStep].description}</p>
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(currentStep / detectionSteps.length) * 100}%` }}
                        />
                      </div>
                      <span>Step {currentStep + 1} of {detectionSteps.length}</span>
                    </div>
                  </div>

                  <LivelinessDetector
                    currentStep={detectionSteps[currentStep]}
                    onStepComplete={handleStepComplete}
                  />
                </>
              ) : (
                <div className="completion-screen">
                  <div className="success-animation">✓</div>
                  <h2>Verification Complete!</h2>
                  <p>All liveliness checks passed successfully.</p>
                  <div className="results-summary">
                    <h3>Results Summary:</h3>
                    {results.map((result, index) => (
                      <div key={index} className="result-item">
                        <span className="step-name">
                          Step {result.stepId}: {detectionSteps.find(s => s.id === result.stepId)?.name}
                        </span>
                        <span className={`status ${result.success ? 'success' : 'failed'}`}>
                          {result.success ? '✓ Passed' : '✗ Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="restart-button"
                    onClick={() => {
                      setIsStarted(false);
                      setCurrentStep(0);
                      setResults([]);
                    }}
                  >
                    Start New Verification
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Liveliness Detection System v1.0 | Security Verification</p>
      </footer>
    </div>
  );
}

export default App;
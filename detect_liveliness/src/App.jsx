// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import LivelinessDetector from './components/LivelinessDetector';
import Instructions from './components/Instructions';
import ProgressIndicator from './components/ProgressIndicator';
import { detectObjects } from './api/detectionCall';

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState([]);
  const [maskDetected, setMaskDetected] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
  });
  const canvasRef = useRef(null);
  const periodicDetectionIntervalRef = useRef(null);

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

  // Periodic detection every 5 seconds while verification is running
  useEffect(() => {
    if (isStarted && !maskDetected) {
      periodicDetectionIntervalRef.current = setInterval(async () => {
        if (canvasRef.current) {
          try {
            const imageBase64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
            if (imageBase64) {
              const detectionResult = await detectObjects(imageBase64, 'image/jpeg');
              console.log('Periodic detection result:', detectionResult);

              // Check if facemask is detected
              if (detectionResult === true) {
                setMaskDetected(true);
                setIsStarted(false);
                // Clear the interval
                if (periodicDetectionIntervalRef.current) {
                  clearInterval(periodicDetectionIntervalRef.current);
                }
              }
            }
          } catch (err) {
            console.error('Error during periodic detection:', err);
          }
        }
      }, 5000); // Call every 5 seconds

      return () => {
        if (periodicDetectionIntervalRef.current) {
          clearInterval(periodicDetectionIntervalRef.current);
        }
      };
    }
  }, [isStarted, maskDetected]);

  const handleStepComplete = (stepId, success) => {
    setResults(prev => [...prev, { stepId, success, timestamp: new Date() }]);
    // Move to next step in activeDetectionSteps, not just increment by 1
    setCurrentStep(prev => prev + 1);
  };

  const handleStepCheckboxChange = (stepId) => {
    setSelectedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCompleteAll = () => {
    setIsStarted(false);
    alert('All detection steps completed successfully!');
  };

  // Filter detection steps based on selected checkboxes
  const activeDetectionSteps = detectionSteps.filter(step => selectedSteps[step.id]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Liveliness Detection System</h1>
        <p>Complete all steps to verify your presence</p>
      </header>

      <main className="app-main">
        {maskDetected ? (
          <div className="mask-detection-screen">
            <div className="mask-alert">
              <div className="alert-icon">⚠️</div>
              <h2>Face Mask Detected</h2>
              <p>A face mask has been detected. Please remove it and start the verification again.</p>
              <button
                className="restart-button"
                onClick={() => {
                  setMaskDetected(false);
                  setIsStarted(false);
                  setCurrentStep(0);
                  setResults([]);
                }}
              >
                Start New Verification
              </button>
            </div>
          </div>
        ) : !isStarted ? (
          <div className="start-screen">
            <h2>Welcome to Liveliness Detection</h2>
            <p className="subtitle">
              This system will guide you through several verification steps to ensure you are physically present.
            </p>

            <div className="steps-overview">
              <h3>Verification Steps:</h3>
              <ul>
                {detectionSteps.map(step => (
                  <li key={step.id} className="step-item">
                    <label className="step-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedSteps[step.id]}
                        onChange={() => handleStepCheckboxChange(step.id)}
                        className="step-checkbox"
                      />
                      <span className="step-number">Step {step.id}:</span>
                      <span className="step-name">{step.name}</span>
                      <span className="step-desc"> - {step.description}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="start-button"
              onClick={() => setIsStarted(true)}
              disabled={Object.values(selectedSteps).every(val => !val)}
            >
              Start Verification
            </button>

            <div className="note-section">
                <p><strong>Note:</strong> Kindly avoid the facemask during the liveliness Verification else the Warning will be given and verification steps will be restarted.</p>
            </div>

            <Instructions />
          </div>
        ) : (
          <div className="verification-screen">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={activeDetectionSteps.length}
              steps={activeDetectionSteps}
              results={results}
            />

            <div className="camera-section">
              {currentStep < activeDetectionSteps.length ? (
                <>
                  <div className="current-task">
                    <h3>Current Task: {activeDetectionSteps[currentStep].name}</h3>
                    <p>{activeDetectionSteps[currentStep].description}</p>
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(currentStep / activeDetectionSteps.length) * 100}%` }}
                        />
                      </div>
                      <span>Step {currentStep + 1} of {activeDetectionSteps.length}</span>
                    </div>
                  </div>

                  <LivelinessDetector
                    currentStep={activeDetectionSteps[currentStep]}
                    onStepComplete={handleStepComplete}
                    canvasRef={canvasRef}
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
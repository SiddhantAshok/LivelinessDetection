// src/components/ProgressIndicator.jsx
import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({ currentStep, totalSteps, steps, results }) => {
    return (
        <div className="progress-indicator">
            <h3>Verification Progress</h3>
            <div className="steps-container">
                {steps.map((step, index) => {
                    const isCompleted = results.some(r => r.stepId === step.id && r.success);
                    const isCurrent = index === currentStep;
                    const isUpcoming = index > currentStep;

                    return (
                        <div
                            key={step.id}
                            className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                        >
                            <div className="step-icon">
                                {isCompleted ? '✓' : step.id}
                            </div>
                            <div className="step-content">
                                <h4>{step.name}</h4>
                                <p>{step.description}</p>
                            </div>
                            <div className="step-status">
                                {isCompleted && <span className="status-badge success">Completed</span>}
                                {isCurrent && <span className="status-badge current">In Progress</span>}
                                {isUpcoming && <span className="status-badge upcoming">Pending</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressIndicator;
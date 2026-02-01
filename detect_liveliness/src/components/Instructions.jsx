// src/components/Instructions.jsx
import React, { useState } from 'react';
import './Instructions.css';

const Instructions = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="instructions-container">
            <button
                className="instructions-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? 'Hide' : 'Show'} Instructions
            </button>

            {isExpanded && (
                <div className="instructions-content">
                    <h3>Important Guidelines:</h3>
                    <div className="guidelines-grid">
                        <div className="guideline">
                            <div className="guideline-icon">📱</div>
                            <h4>Device Setup</h4>
                            <ul>
                                <li>Use a device with a front-facing camera</li>
                                <li>Ensure stable internet connection</li>
                                <li>Grant camera permissions when prompted</li>
                            </ul>
                        </div>

                        <div className="guideline">
                            <div className="guideline-icon">💡</div>
                            <h4>Lighting</h4>
                            <ul>
                                <li>Face toward natural light if possible</li>
                                <li>Avoid backlighting or strong shadows</li>
                                <li>Ensure your face is evenly lit</li>
                            </ul>
                        </div>

                        <div className="guideline">
                            <div className="guideline-icon">👤</div>
                            <h4>Positioning</h4>
                            <ul>
                                <li>Keep your face centered in frame</li>
                                <li>Maintain a distance of 1-2 feet</li>
                                <li>Remove glasses if they cause glare</li>
                            </ul>
                        </div>

                        <div className="guideline">
                            <div className="guideline-icon">✅</div>
                            <h4>During Verification</h4>
                            <ul>
                                <li>Follow instructions step by step</li>
                                <li>Hold each pose for 1-2 seconds</li>
                                <li>Perform actions naturally and clearly</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Instructions;
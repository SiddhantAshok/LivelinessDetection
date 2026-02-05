// src/components/LivelinessDetector.jsx
import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import './LivelinessDetector.css';

const LivelinessDetector = ({ currentStep, onStepComplete, canvasRef: parentCanvasRef }) => {
    const webcamRef = useRef(null);
    const localCanvasRef = useRef(null);
    const canvasRef = parentCanvasRef || localCanvasRef;
    const faceLandmarkerRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const animationRef = useRef(null);
    const lastCompletedStepRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detectionStatus, setDetectionStatus] = useState('');
    const [timer, setTimer] = useState(0);
    const [showFaceMesh, setShowFaceMesh] = useState(true);
    const [showHandMesh, setShowHandMesh] = useState(true);
    const timerRef = useRef(0);

    // Detection thresholds and states
    const detectionState = useRef({
        smileDetected: false,
        headRightDetected: false,
        headLeftDetected: false,
        mouthOpenDetected: false,
        mouthOpenStart: null,
        oneFingerDetected: false,
        twoFingersDetected: false,
        blinkDetected: false,
        nodDetected: false,
    });

    // Initialize MediaPipe Landmarkers
    useEffect(() => {
        const initializeDetectors = async () => {
            try {
                console.log('Starting MediaPipe initialization...');
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                console.log('Vision tasks loaded');

                console.log('Loading Face Landmarker...');
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    outputFacialTransformationMatrixes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                console.log('Face Landmarker loaded');

                console.log('Loading Hand Landmarker...');
                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2
                });
                console.log('Hand Landmarker loaded');

                setIsLoading(false);
                console.log('Initialization complete');
            } catch (err) {
                console.error('Detailed error:', err);
                setError('Failed to initialize detection models: ' + (err.message || 'Unknown error') + '. Please refresh the page and check your internet connection.');
            }
        };

        initializeDetectors();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Reset detection state when step changes
    useEffect(() => {
        lastCompletedStepRef.current = null; // Reset the last completed step
        detectionState.current = {
            smileDetected: false,
            headRightDetected: false,
            headLeftDetected: false,
            mouthOpenDetected: false,
            mouthOpenStart: null,
            oneFingerDetected: false,
            twoFingersDetected: false,
            blinkDetected: false,
            nodDetected: false,
        };
        setTimer(0);
        setDetectionStatus('');
    }, [currentStep]);

    // Helper function to calculate head rotation from landmarks
    const getHeadRotation = (landmarks) => {
        if (!landmarks || landmarks.length < 10) return { yaw: 0, pitch: 0 };

        // Key facial landmarks for rotation detection
        // 33: Left eye inner, 263: Right eye inner (for yaw)
        // 152: Mouth top, 175: Mouth bottom (for pitch)
        
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const mouthTop = landmarks[152];
        const mouthBottom = landmarks[175];
        const nose = landmarks[1];

        if (!leftEye || !rightEye || !nose) {
            return { yaw: 0, pitch: 0 };
        }

        // Calculate yaw (horizontal rotation) using nose position relative to eyes
        const centerX = (leftEye.x + rightEye.x) / 2;
        const noseXOffset = nose.x - centerX;
        
        // Normalize by eye distance
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const yaw = eyeDistance > 0 ? noseXOffset / eyeDistance : 0;

        // Calculate pitch (vertical rotation) using nose position
        const centerY = (leftEye.y + rightEye.y) / 2;
        const noseYOffset = nose.y - centerY;
        
        return {
            yaw: yaw,  // Positive = right turn, Negative = left turn
            pitch: noseYOffset  // Positive = looking down, Negative = looking up
        };
    };

    // Detection logic
    const detectStep = (landmarks, blendshapes, rotation, handLandmarks) => {
        if (!landmarks || landmarks.length === 0) {
            setDetectionStatus('No face detected. Please position yourself in frame.');
            return false;
        }

        const stepId = currentStep.id;
        const headRotation = getHeadRotation(landmarks);

        switch (stepId) {
            case 1: // Smile
                return detectSmile(blendshapes);

            case 2: // Turn Head Right
                return detectHeadRight(headRotation);

            case 3: // Turn Head Left
                return detectHeadLeft(headRotation);

            case 4: // Open Mouth for 5 seconds
                return detectMouthOpen(blendshapes);

            case 5: // Show 1 finger
                return detectOneFinger(handLandmarks);

            case 6: // Show 2 fingers
                return detectTwoFingers(handLandmarks);

            case 7: // Blink Eyes
                return detectBlink(blendshapes);

            case 8: // Nod Head
                return detectNod(headRotation);

            default:
                return false;
        }
    };

    // Individual detection functions
    const detectSmile = (blendshapes) => {
        const smileIndex = blendshapes.findIndex(shape => shape.categoryName === 'mouthSmileLeft');
        const smileValue = blendshapes[smileIndex]?.score || 0;

        if (smileValue > 0.5) {
            if (!detectionState.current.smileDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.smileDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.smileDetected = false;
                }, 1000);
            }
            setDetectionStatus('Smile detected! ✓');
            return true;
        }
        setDetectionStatus('Please smile naturally');
        return false;
    };

    const detectHeadRight = (rotation) => {
        // rotation.yaw is positive when head turns right
        // Made threshold much more lenient for better detection
        if (rotation && rotation.yaw < -0.02) {
            if (!detectionState.current.headRightDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.headRightDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.headRightDetected = false;
                }, 1000);
            }
            setDetectionStatus(`Head turned right ✓ (${rotation.yaw.toFixed(3)})`);
            return true;
        }
        setDetectionStatus(`Please turn your head to the right (${rotation?.yaw?.toFixed(3) || 0})`);
        return false;
    };

    const detectHeadLeft = (rotation) => {
        // rotation.yaw is negative when head turns left
        // Made threshold much more lenient for better detection
        if (rotation && rotation.yaw > 0.02) {
            if (!detectionState.current.headLeftDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.headLeftDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.headLeftDetected = false;
                }, 1000);
            }
            setDetectionStatus(`Head turned left ✓ (${rotation.yaw.toFixed(3)})`);
            return true;
        }
        setDetectionStatus(`Please turn your head to the left (${rotation?.yaw?.toFixed(3) || 0})`);
        return false;
    };

    const detectMouthOpen = (blendshapes) => {
        const jawOpenIndex = blendshapes.findIndex(shape => shape.categoryName === 'jawOpen');
        const mouthOpenIndex = blendshapes.findIndex(shape => shape.categoryName === 'mouthOpen');
        
        const jawOpenValue = blendshapes[jawOpenIndex]?.score || 0;
        const mouthOpenValue = blendshapes[mouthOpenIndex]?.score || 0;
        
        // Use the maximum of both mouth open indicators
        const mouthOpen = Math.max(jawOpenValue, mouthOpenValue);

        // Lowered threshold from 0.2 to 0.15 for better detection
        if (mouthOpen > 0.15) {
            if (!detectionState.current.mouthOpenStart) {
                detectionState.current.mouthOpenStart = Date.now();
            }

            const elapsed = Math.floor((Date.now() - detectionState.current.mouthOpenStart) / 1000);
            setTimer(elapsed);

            if (elapsed >= 5) {
                onStepComplete(currentStep.id, true);
                detectionState.current.mouthOpenStart = null;
                setTimer(0);
                setDetectionStatus('Mouth open for 5 seconds ✓');
                return true;
            }

            setDetectionStatus(`Keep mouth open: ${elapsed}/5 seconds`);
            return false;
        } else {
            detectionState.current.mouthOpenStart = null;
            setTimer(0);
            setDetectionStatus('Please open your mouth wide');
            return false;
        }
    };

    const detectOneFinger = (handLandmarks) => {
        if (!handLandmarks || handLandmarks.length === 0) {
            setDetectionStatus('Please show your hand');
            return false;
        }

        const landmarks = handLandmarks[0];

        // Check fingertips relative to PIP joints (y-coordinate for upright hand)
        // 8: Index Tip, 6: Index PIP
        const isIndexExtended = landmarks[8].y < landmarks[6].y;

        // Check other fingers are curled
        const isMiddleCurled = landmarks[12].y > landmarks[10].y;
        const isRingCurled = landmarks[16].y > landmarks[14].y;
        const isPinkyCurled = landmarks[20].y > landmarks[18].y;

        if (isIndexExtended && isMiddleCurled && isRingCurled && isPinkyCurled) {
            if (!detectionState.current.oneFingerDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.oneFingerDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.oneFingerDetected = false;
                }, 1000);
            }
            setDetectionStatus('One finger detected! ✓');
            return true;
        }

        setDetectionStatus('Show exactly one finger (index)');
        return false;
    };

    const detectTwoFingers = (handLandmarks) => {
        if (!handLandmarks || handLandmarks.length === 0) {
            setDetectionStatus('Please show your hand');
            return false;
        }

        const landmarks = handLandmarks[0];

        // fingers extended
        const isIndexExtended = landmarks[8].y < landmarks[6].y;
        const isMiddleExtended = landmarks[12].y < landmarks[10].y;

        // fingers curled
        const isRingCurled = landmarks[16].y > landmarks[14].y;
        const isPinkyCurled = landmarks[20].y > landmarks[18].y;

        if (isIndexExtended && isMiddleExtended && isRingCurled && isPinkyCurled) {
            if (!detectionState.current.twoFingersDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.twoFingersDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.twoFingersDetected = false;
                }, 1000);
            }
            setDetectionStatus('Two fingers detected! ✓');
            return true;
        }

        setDetectionStatus('Show two fingers (index & middle)');
        return false;
    };

    const detectBlink = (blendshapes) => {
        const eyeBlinkLeftIndex = blendshapes.findIndex(shape => shape.categoryName === 'eyeBlinkLeft');
        const eyeBlinkRightIndex = blendshapes.findIndex(shape => shape.categoryName === 'eyeBlinkRight');

        const leftBlinkValue = blendshapes[eyeBlinkLeftIndex]?.score || 0;
        const rightBlinkValue = blendshapes[eyeBlinkRightIndex]?.score || 0;
        const blinkValue = Math.max(leftBlinkValue, rightBlinkValue);

        // Significantly lowered threshold for better detection
        if (blinkValue > 0.3 && !detectionState.current.blinkDetected && lastCompletedStepRef.current !== currentStep.id) {
            detectionState.current.blinkDetected = true;
            lastCompletedStepRef.current = currentStep.id;
            console.log('Step Complete:', currentStep.id);
            setTimeout(() => {
                onStepComplete(currentStep.id, true);
                detectionState.current.blinkDetected = false;
            }, 1000);
            setDetectionStatus(`Blink detected! ✓ (${blinkValue.toFixed(3)})`);
            return true;
        }
        setDetectionStatus(`Please blink your eyes naturally (${blinkValue.toFixed(3)})`);
        return false;
    };

    const detectNod = (rotation) => {
        // For nodding, we detect vertical movement
        // Using pitch value from head rotation calculation
        if (rotation && Math.abs(rotation.pitch) > 0.09) {
            if (!detectionState.current.nodDetected && lastCompletedStepRef.current !== currentStep.id) {
                detectionState.current.nodDetected = true;
                lastCompletedStepRef.current = currentStep.id;
                console.log('Step Complete:', currentStep.id);
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.nodDetected = false;
                }, 1000);
            }
            setDetectionStatus('Head nod detected ✓');
            return true;
        }
        setDetectionStatus('Please nod your head');
        return false;
    };

    // Process webcam frames
    const processFrame = async () => {
        if (!webcamRef.current || !faceLandmarkerRef.current || !handLandmarkerRef.current || isLoading) {
            animationRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const video = webcamRef.current.video;
        if (video.readyState !== 4) {
            animationRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Run face detection
        const startTimeMs = Date.now();
        const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
        const handResults = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

        const drawingUtils = new DrawingUtils(ctx);

        // Draw face landmarks
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            for (const landmarks of results.faceLandmarks) {
                // Only draw face mesh if showFaceMesh is true
                if (showFaceMesh) {
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                        { color: '#C0C0C070', lineWidth: 1 }
                    );
                }
            }

            // Run step detection
            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                const blendshapes = results.faceBlendshapes[0].categories;
                const rotation = results.facialTransformationMatrixes?.[0]?.data;

                detectStep(results.faceLandmarks[0], blendshapes, rotation, handResults.landmarks);
            }
        }

        // Draw hand landmarks
        if (handResults.landmarks && handResults.landmarks.length > 0) {
            for (const landmarks of handResults.landmarks) {
                // Only draw hand mesh if showHandMesh is true
                if (showHandMesh) {
                    drawingUtils.drawConnectors(
                        landmarks,
                        HandLandmarker.HAND_CONNECTIONS,
                        { color: '#00FF00', lineWidth: 2 }
                    );
                    drawingUtils.drawLandmarks(
                        landmarks,
                        { color: '#FF0000', lineWidth: 1 }
                    );
                }
            }
        }

        animationRef.current = requestAnimationFrame(processFrame);
    };

    useEffect(() => {
        if (!isLoading && !error) {
            animationRef.current = requestAnimationFrame(processFrame);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isLoading, error, currentStep, showFaceMesh, showHandMesh]);

    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="detector-container">
            <div className="camera-wrapper">
                <Webcam
                    ref={webcamRef}
                    className="webcam"
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: "user"
                    }}
                />
                <canvas
                    ref={canvasRef}
                    className="overlay-canvas"
                />

                {currentStep.id === 4 && timer > 0 && (
                    <div className="timer-display">
                        <div className="timer-circle">
                            <span>{timer}s</span>
                            <div className="timer-text">Keep mouth open</div>
                        </div>
                    </div>
                )}

                <div className="mesh-toggle-buttons">
                    <button
                        className={`toggle-btn ${showFaceMesh ? 'active' : 'inactive'}`}
                        onClick={() => setShowFaceMesh(!showFaceMesh)}
                        title="Toggle Face Mesh"
                    >
                        👤 Face Mesh
                    </button>
                    <button
                        className={`toggle-btn ${showHandMesh ? 'active' : 'inactive'}`}
                        onClick={() => setShowHandMesh(!showHandMesh)}
                        title="Toggle Hand Mesh"
                    >
                        ✋ Hand Mesh
                    </button>
                </div>
            </div>

            <div className="detection-info">
                <div className="status-indicator">
                    <div className={`status-dot ${detectionStatus.includes('✓') ? 'active' : 'inactive'}`} />
                    <span className="status-text">{detectionStatus}</span>
                </div>

                <div className="step-instructions">
                    <h4>Instructions:</h4>
                    <p>{currentStep.description}</p>
                    <ul className="tips">
                        <li>Ensure good lighting</li>
                        <li>Keep your face within the frame</li>
                        <li>Follow the instructions carefully</li>
                        <li>Hold each pose for 1-2 seconds</li>
                    </ul>
                </div>
            </div>

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Initializing camera and detection models...</p>
                </div>
            )}
        </div>
    );
};

export default LivelinessDetector;
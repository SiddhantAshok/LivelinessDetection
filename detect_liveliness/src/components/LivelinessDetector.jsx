// src/components/LivelinessDetector.jsx
import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import './LivelinessDetector.css';

const LivelinessDetector = ({ currentStep, onStepComplete }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const animationRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detectionStatus, setDetectionStatus] = useState('');
    const [timer, setTimer] = useState(0);
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
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

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

                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2
                });

                setIsLoading(false);
            } catch (err) {
                setError('Failed to initialize detection models. Please check your camera permissions.');
                console.error(err);
            }
        };

        initializeDetectors();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Detection logic
    const detectStep = (landmarks, blendshapes, rotation, handLandmarks) => {
        if (!landmarks || landmarks.length === 0) {
            setDetectionStatus('No face detected. Please position yourself in frame.');
            return false;
        }

        const stepId = currentStep.id;

        switch (stepId) {
            case 1: // Smile
                return detectSmile(blendshapes);

            case 2: // Turn Head Right
                return detectHeadRight(rotation);

            case 3: // Turn Head Left
                return detectHeadLeft(rotation);

            case 4: // Open Mouth for 5 seconds
                return detectMouthOpen(blendshapes);

            case 5: // Show 1 finger
                return detectOneFinger(handLandmarks);

            case 6: // Show 2 fingers
                return detectTwoFingers(handLandmarks);

            case 7: // Blink Eyes
                return detectBlink(blendshapes);

            case 8: // Nod Head
                return detectNod(rotation);

            default:
                return false;
        }
    };

    // Individual detection functions
    const detectSmile = (blendshapes) => {
        const smileIndex = blendshapes.findIndex(shape => shape.categoryName === 'mouthSmileLeft');
        const smileValue = blendshapes[smileIndex]?.score || 0;

        if (smileValue > 0.5) {
            if (!detectionState.current.smileDetected) {
                detectionState.current.smileDetected = true;
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
        // rotation[1] is yaw (left-right rotation)
        if (rotation && rotation[1] > 0.2) {
            if (!detectionState.current.headRightDetected) {
                detectionState.current.headRightDetected = true;
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.headRightDetected = false;
                }, 1000);
            }
            setDetectionStatus('Head turned right ✓');
            return true;
        }
        setDetectionStatus('Please turn your head to the right');
        return false;
    };

    const detectHeadLeft = (rotation) => {
        if (rotation && rotation[1] < -0.2) {
            if (!detectionState.current.headLeftDetected) {
                detectionState.current.headLeftDetected = true;
                setTimeout(() => {
                    onStepComplete(currentStep.id, true);
                    detectionState.current.headLeftDetected = false;
                }, 1000);
            }
            setDetectionStatus('Head turned left ✓');
            return true;
        }
        setDetectionStatus('Please turn your head to the left');
        return false;
    };

    const detectMouthOpen = (blendshapes) => {
        const jawOpenIndex = blendshapes.findIndex(shape => shape.categoryName === 'jawOpen');
        const jawOpenValue = blendshapes[jawOpenIndex]?.score || 0;

        if (jawOpenValue > 0.2) {
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
            if (!detectionState.current.oneFingerDetected) {
                detectionState.current.oneFingerDetected = true;
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
            if (!detectionState.current.twoFingersDetected) {
                detectionState.current.twoFingersDetected = true;
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

        const blinkValue = Math.max(
            blendshapes[eyeBlinkLeftIndex]?.score || 0,
            blendshapes[eyeBlinkRightIndex]?.score || 0
        );

        if (blinkValue > 0.7 && !detectionState.current.blinkDetected) {
            detectionState.current.blinkDetected = true;
            setTimeout(() => {
                onStepComplete(currentStep.id, true);
                detectionState.current.blinkDetected = false;
            }, 1000);
            setDetectionStatus('Blink detected! ✓');
            return true;
        }
        setDetectionStatus('Please blink your eyes naturally');
        return false;
    };

    const detectNod = (rotation) => {
        // rotation[0] is pitch (nodding up-down)
        if (rotation && Math.abs(rotation[0]) > 0.4) {
            if (!detectionState.current.nodDetected) {
                detectionState.current.nodDetected = true;
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
                drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                    { color: '#C0C0C070', lineWidth: 1 }
                );
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
    }, [isLoading, error, currentStep]);

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
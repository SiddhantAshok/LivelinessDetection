const BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_BASE_URL;

// Helper function to crop image based on face landmarks
export const cropImageToFace = (canvas, faceLandmarks) => {
    if (!faceLandmarks || faceLandmarks.length === 0) {
        return canvas.toDataURL('image/jpeg');
    }

    try {
        // Get canvas dimensions
        const width = canvas.width;
        const height = canvas.height;

        // Calculate bounding box from face landmarks
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        
        for (const landmark of faceLandmarks) {
            minX = Math.min(minX, landmark.x);
            maxX = Math.max(maxX, landmark.x);
            minY = Math.min(minY, landmark.y);
            maxY = Math.max(maxY, landmark.y);
        }

        // Add padding around face (20% on each side)
        const padding = 0.4;
        const faceWidth = maxX - minX;
        const faceHeight = maxY - minY;
        
        const cropX = Math.max(0, (minX - padding * faceWidth) * width);
        const cropY = Math.max(0, (minY - padding * faceHeight) * height);
        const cropWidth = Math.min(width - cropX, (faceWidth + 2 * padding * faceWidth) * width);
        const cropHeight = Math.min(height - cropY, (faceHeight + 2 * padding * faceHeight) * height);

        // Create a new canvas for the cropped image
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;

        const ctx = croppedCanvas.getContext('2d');
        ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        return croppedCanvas.toDataURL('image/jpeg');
    } catch (err) {
        console.error('Error cropping image:', err);
        // Return original if cropping fails
        return canvas.toDataURL('image/jpeg');
    }
};

export const checkApiHealth = async () => {
    try {
        const res = await fetch(`${BASE_URL}/ok`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error("API is not running");
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        throw err;
    }
};


export const detectObjects = async (imageBase64, imageType, timeout = 120000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(`${BASE_URL}/detect-liveObjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image_base64: imageBase64,
                image_type: imageType
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId); // clear if successful

        const data = await res.json();
        // console.log("Data : ", imageBase64, imageType)
        if (!data.status) {
            throw new Error(data.message || "Detection failed");
        }
        return data.isDetection;
    } catch (err) {
        clearTimeout(timeoutId); // ensure timeout is cleared on any error

        if (err.name === "AbortError") {
            console.error("Request timed out after 2 minutes");
            throw new Error("Request timed out after 2 minutes");
        }

        console.error(err);
        throw err;
    }
};
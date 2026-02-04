const BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_BASE_URL;

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
        console.log("Data : ", imageBase64, imageType)
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
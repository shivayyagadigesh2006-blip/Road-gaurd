
import { RoadAnalysis } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export class RoadAnalysisService {
  private backendUrl: string;

  constructor(backendUrl: string = BACKEND_URL) {
    this.backendUrl = backendUrl;
  }

  async analyzeRoadCondition(base64Data: string, mimeType: string): Promise<RoadAnalysis> {
    const isVideo = mimeType.startsWith('video/');
    
    try {
      // Check backend health first
      const healthResponse = await fetch(`${this.backendUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error("Analysis backend is unavailable. Please ensure the backend server is running on port 5000.");
      }

      const endpoint = isVideo ? `${this.backendUrl}/analyze/video` : `${this.backendUrl}/analyze`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout for large videos 

      let response;
      try {
        if (isVideo) {
            // Use FormData for videos to avoid Base64 overhead (OOM fix)
            const formData = new FormData();
            // Convert base64 back to blob if it's already base64 (which it is from FileReader)
            // But wait, FileReader gave us DataURL.
            // Ideally we should pass the File object directly to this service. 
            // BUT, to minimize changes, let's fetch the blob from the DataURL.
            
            const fetchBlob = await fetch(base64Data);
            const blob = await fetchBlob.blob();
            formData.append('video', blob, 'video.mp4');
            formData.append('mimeType', mimeType);

            response = await fetch(endpoint, {
                method: 'POST',
                body: formData, // No Content-Type header needed (browser sets it with boundary)
                signal: controller.signal
            });
        } else {
            // Keep JSON for images (small enough)
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: base64Data,
                mimeType: mimeType
              }),
              signal: controller.signal
            });
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
           const errorText = await response.text();
           throw new Error(`Analysis failed: ${response.status} ${response.statusText} - ${errorText}`);
      }


      const analysis = (await response.json()) as RoadAnalysis;
      return analysis;
    } catch (error: any) {
      console.error("Road Condition Analysis Error:", error);
      
      if (error.message?.includes('backend')) {
        throw new Error(error.message);
      }
      
      if (error.message?.includes('Network')) {
        throw new Error("Network Error: Cannot connect to analysis backend. Ensure it's running on port 5000.");
      }
      
      throw new Error(error.message || "Failed to analyze road condition. Check backend connection.");
    }
  }
}

export const geminiService = new RoadAnalysisService();

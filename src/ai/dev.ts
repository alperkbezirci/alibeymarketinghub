
import { config } from 'dotenv';
config();

// Import ONLY the motivational message flow for now to isolate the issue.
// import '@/ai/flows/ai-assisted-descriptions.ts';
// import '@/ai/flows/weather-forecast-flow.ts';
import '@/ai/flows/ai-motivational-message.ts'; // Sadece bu akışı import et

console.log('[Genkit Dev - dev.ts] Genkit development server starting with ONLY ai-motivational-message flow.');

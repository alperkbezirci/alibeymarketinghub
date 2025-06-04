
import { config } from 'dotenv';
config();

// Karşılama mesajı akışı kaldırıldı.
import '@/ai/flows/ai-assisted-descriptions.ts'; 
import '@/ai/flows/weather-forecast-flow.ts';

console.log('[Genkit Dev - dev.ts] Genkit development server starting with Weather and Description flows.');

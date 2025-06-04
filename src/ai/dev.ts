
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-assisted-descriptions.ts';
// ai-powered-welcome.ts import was removed in a previous step, ensuring it stays removed.
import '@/ai/flows/weather-forecast-flow.ts';
import '@/ai/flows/ai-motivational-message.ts'; // Yeni AI akışını import et

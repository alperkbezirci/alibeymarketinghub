
import { config } from 'dotenv';
config();

// Sadece üzerinde çalıştığımız motivasyon mesajı akışını import et (SÜPER BASİT VERSİYON)
import '@/ai/flows/ai-motivational-message.ts'; 
// import '@/ai/flows/ai-assisted-descriptions.ts'; // Şimdilik yorum satırında kalsın
// import '@/ai/flows/weather-forecast-flow.ts'; // Şimdilik yorum satırında kalsın

console.log('[Genkit Dev - dev.ts] Genkit development server starting with ONLY ai-motivational-message flow (SUPER SIMPLE RESET).');

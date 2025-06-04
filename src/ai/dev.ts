
import { config } from 'dotenv';
config();

// Karşılama mesajı akışı kaldırıldığı için ilgili import da kaldırıldı.
// import '@/ai/flows/ai-motivational-message.ts'; 
import '@/ai/flows/ai-assisted-descriptions.ts'; // Bu akış kalabilir veya isteğe bağlı olarak kaldırılabilir.
// import '@/ai/flows/weather-forecast-flow.ts'; // Şimdilik yorum satırında kalsın

console.log('[Genkit Dev - dev.ts] Genkit development server starting WITHOUT ai-motivational-message flow.');

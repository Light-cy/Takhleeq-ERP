import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authMiddleware } from './middleware/auth.ts';

// Route Imports
import userRoutes from './modules/users/users.routes.ts';
import roleRoutes from './modules/roles/roles.routes.ts';
import roomRoutes from './modules/rooms/rooms.routes.ts';
import bookingRoutes from './modules/bookings/bookings.routes.ts';
import bookingTypeRoutes from './modules/bookings/booking-types.routes.ts';
import banRoutes from './modules/bans/bans.routes.ts';
import auditRoutes from './modules/audit/audit.routes.ts';
import chatbotRoutes from './modules/chatbot/chatbot.routes.ts';

const PORT = 3000;

export async function startServer() {
  const app = express();
  app.use(express.json());

  // Attach auth simulation middleware
  app.use(authMiddleware as express.RequestHandler);

  // Mount API routers under `/api` prefix
  app.use('/api', userRoutes);
  app.use('/api', roleRoutes);
  app.use('/api', roomRoutes);
  app.use('/api', bookingRoutes);
  app.use('/api', bookingTypeRoutes);
  app.use('/api', banRoutes);
  app.use('/api', auditRoutes);
  app.use('/api', chatbotRoutes);

  // --- INTEGRATION WITH VITE FOR WEB SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // In Express v4, wildcard is get('*', ...). If there's an issue with *all, we use '*'
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Takhleeq ERP Modular Express server running on http://localhost:${PORT}`);
  });
}

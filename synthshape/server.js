import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Apply middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'dist')));

// Routes will be dynamically imported since they use ESM
let modelRoutes;
let thingiverseRoutes;

// Import model generation routes
const importRoutes = async () => {
  try {
    // Dynamic import for ESM compatibility
    const modelModule = await import('./server/routes/modelRoutes.js');
    modelRoutes = modelModule.default;
    
    const thingiverseModule = await import('./server/routes/thingiverseRoutes.js');
    thingiverseRoutes = thingiverseModule.default;
    
    // Apply routes
    app.use('/api/models', modelRoutes);
    app.use('/api/thingiverse', thingiverseRoutes);
    
    console.log('All routes loaded successfully');
  } catch (error) {
    console.error('Failed to load routes:', error);
  }
};

// Handle all other routes by serving the Vue app directli
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start the server
const startServer = async () => {
  await importRoutes();
  
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API available at http://localhost:${port}/api`);
    console.log(`Frontend available at http://localhost:${port}`);
  });
};

startServer();
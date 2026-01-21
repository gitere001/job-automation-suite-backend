import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import scrappingRoutes from './routes/scrappingRoutes.js';
import jobApplicationRoutes from './routes/jobApplicationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import corsMiddleware from './config/cors.js';




dotenv.config();
connectDB();




const app = express();
const PORT = process.env.PORT || 3000;




app.use(cookieParser());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scrapping', scrappingRoutes);
app.use('/api/v1/job-applications', jobApplicationRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
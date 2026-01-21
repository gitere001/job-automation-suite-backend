import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import scrappingRoutes from './routes/scrappingRoutes.js';
import jobApplicationRoutes from './routes/jobApplicationRoutes.js';



dotenv.config();
connectDB();




const app = express();
const PORT = process.env.PORT || 3000;




app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Routes
app.use('/api/scrapping', scrappingRoutes);
app.use('/api/job-applications', jobApplicationRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
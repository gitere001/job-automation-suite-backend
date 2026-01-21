import cors from "cors"
import dotenv from 'dotenv'
dotenv.config();
const corsOptions = {
	origin: process.env.CLIENT_URL || "http://localhost:5173",
	optionsSuccessStatus: 200,
	credentials: true,
}
console.log(corsOptions);

export default cors(corsOptions)
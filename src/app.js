import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    // aur bhi explore kar sakte ho.
}))

app.use(express.json({limit: "20kb"}))
app.use(express.urlencoded({extended: true, limit: "20kb"}))       // for hadling the URL data form client
app.use(express.static("public"))              // for static assets accessing
app.use(cookieParser())              // for retreving cookie and performing CRUD operation to it


// routes import 
import userRouter from './routes/user.routes.js'

// routes declaration
app.use('/api/v1/users', userRouter)

// http://localhost:8000/api/v1/users/register

export { app }
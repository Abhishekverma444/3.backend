// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';

// const app = express();

// app.use(cors({
//     origin: process.env.CORS_ORIGIN,
//     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
//     credentials: true,
//     // aur bhi explore kar sakte ho.
// }))

// app.use(express.json({limit: "20kb"}))
// app.use(express.urlencoded({extended: true, limit: "20kb"}))       // for hadling the URL data form client
// app.use(express.static("public"))              // for static assets accessing
// app.use(cookieParser())              // for retreving cookie and performing CRUD operation to it


// // routes import 
// import userRouter from './routes/user.routes.js'
// import healthcheckRouter from './routes/healthcheck.routes.js'
// import tweetRouter from "./routes/tweet.routes.js"
// import subscriptionRouter from './routes/subscription.routes.js'
// import videoRouter from './routes/video.routes.js'
// import commentRouter from './routes/comment.routes.js'
// import likeRouter from './routes/like.routes.js'
// import playlistRouter from './routes/playlist.routes.js'
// import dashboardRouter from './routes/dashboard.routes.js'


// // routes declaration
// app.use('/api/v1/users', userRouter)
// app.use("/api/v1/healthcheck", healthcheckRouter)
// app.use("/api/v1/tweets", tweetRouter)
// app.use("/api/v1/subscriptions", subscriptionRouter)
// app.use("/api/v1/videos", videoRouter)
// app.use("/api/v1/comments", commentRouter)
// app.use("/api/v1/likes", likeRouter)
// app.use("/api/v1/playlist", playlistRouter)
// app.use("/api/v1/dashboard", dashboardRouter)

// // http://localhost:8000/api/v1/users/register

// export { app }





// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// // ES module alternative to __dirname
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Define the upload directory relative to the project root directory
// const uploadDir = path.join(__dirname, '../public/temp');

// // Function to ensure the upload directory exists
// const ensureUploadDirExists = () => {
//     if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//         console.log('Upload directory created:', uploadDir);
//     } else {
//         console.log('Upload directory already exists:', uploadDir);
//     }
// };

// // Ensure the upload directory exists at startup
// ensureUploadDirExists();

// app.use(cors({
//     origin: process.env.CORS_ORIGIN,
//     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
//     credentials: true,
// }));

// app.use(express.json({ limit: "20kb" }));
// app.use(express.urlencoded({ extended: true, limit: "20kb" }));
// app.use(express.static(path.join(__dirname, '../public')));
// app.use(cookieParser());

// // Middleware to ensure the directory exists before handling file uploads
// app.use((req, res, next) => {
//     try {
//         ensureUploadDirExists();
//         next();
//     } catch (err) {
//         console.error('Error ensuring upload directory exists:', err);
//         res.status(500).send('Server error: cannot ensure upload directory');
//     }
// });

// // routes import 
// import userRouter from './routes/user.routes.js';
// import healthcheckRouter from './routes/healthcheck.routes.js';
// import tweetRouter from "./routes/tweet.routes.js";
// import subscriptionRouter from './routes/subscription.routes.js';
// import videoRouter from './routes/video.routes.js';
// import commentRouter from './routes/comment.routes.js';
// import likeRouter from './routes/like.routes.js';
// import playlistRouter from './routes/playlist.routes.js';
// import dashboardRouter from './routes/dashboard.routes.js';

// // routes declaration
// app.use('/api/v1/users', userRouter);
// app.use("/api/v1/healthcheck", healthcheckRouter);
// app.use("/api/v1/tweets", tweetRouter);
// app.use("/api/v1/subscriptions", subscriptionRouter);
// app.use("/api/v1/videos", videoRouter);
// app.use("/api/v1/comments", commentRouter);
// app.use("/api/v1/likes", likeRouter);
// app.use("/api/v1/playlist", playlistRouter);
// app.use("/api/v1/dashboard", dashboardRouter);

// // Example route to ensure the server is running
// app.get('/', (req, res) => {
//     res.send('Server is running!');
// });

// // http://localhost:8000/api/v1/users/register

// export { app };






import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module alternative to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Define the upload directory relative to the project root directory
const uploadDir = path.join(__dirname, '../public/temp');

// Function to ensure the upload directory exists
const ensureUploadDirExists = () => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Upload directory created:', uploadDir);
    } else {
        console.log('Upload directory already exists:', uploadDir);
    }
};

// Ensure the upload directory exists at startup
ensureUploadDirExists();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
}));

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Middleware to ensure the directory exists before handling file uploads
app.use((req, res, next) => {
    try {
        ensureUploadDirExists();
        next();
    } catch (err) {
        console.error('Error ensuring upload directory exists:', err);
        res.status(500).send('Server error: cannot ensure upload directory');
    }
});

// routes import 
import userRouter from './routes/user.routes.js';
import healthcheckRouter from './routes/healthcheck.routes.js';
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from './routes/subscription.routes.js';
import videoRouter from './routes/video.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

// routes declaration
app.use('/api/v1/users', userRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Example route to ensure the server is running
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// http://localhost:8000/api/v1/users/register

export { app };

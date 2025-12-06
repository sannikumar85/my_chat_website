const express = require('express');
const cookieParser = require('cookie-parser');
const cors= require('cors');
const dotenv = require('dotenv');
const connectDb = require('./config/dbConnect');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoute');
const chatRoutes = require('./routes/chatRoute');
const statusRoute = require('./routes/statusRoute');
const http = require('http')
const initlizeSocket = require('./services/socketService')


dotenv.config();

const PORT = process.env.PORT ;
const app = express();


const corsOptions={
    origin:process.env.FRONTEND_URL,
    credentials:true
}

app.use(cors(corsOptions))  





// Middleware
app.use(express.json());// Parse JSON bodies
app.use(cookieParser()); // Parse cookies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies




//database connection 
connectDb();




//server
const server = http.createServer(app);

const io= initlizeSocket(server)

app.use((req,res,next)=>{
    req.io =io;
    req.socketUserMap=io.socketUserMap
    next();
})





//routes
app.use('/api/auth/', authRoutes);
app.use('/api/chat/', chatRoutes);
app.use('/api/status/', statusRoute);








server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

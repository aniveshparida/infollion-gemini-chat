import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import {GoogleGenerativeAI} from '@google/generative-ai';
import { PDFParse } from 'pdf-parse';

dotenv.config();
const app=express();
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const port = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY|| ' ');

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

const chatSessions = new Map<string,any[]>();

const upload =multer({
    storage: multer.memoryStorage(),
    limits:{fileSize: 10*1024*1024}
});

app.post('/api/chat',upload.fields([{name:'document',maxCount:1},{name:'image',maxCount:1}]),async(req:any,res:any)=>{
    try{
        const {message,chatId}=req.body;

        if(!chatId){
            return res.status(400).json({error: "chatId is required"});
        }
        const files=req.files as {[fieldname:string]: Express.Multer.File[]};
        const document= files?.['document']?.[0];
        const image= files?.['image']?.[0];

        let history=chatSessions.get(chatId);
        if(!history){
            history = [];
            chatSessions.set(chatId,history);
        }
        let promptText=message||"";
        const userParts: any[]=[];
        if(document){
            let docText="";
            if(document.mimetype==='application/pdf'){
                const parser = new PDFParse({ data: document.buffer });
                const pdfData = await parser.getText();
                docText=pdfData.text;
            }
            else if(document.mimetype === 'text/plain'){
               docText = document.buffer.toString('utf-8');
            }
            promptText=`[Attached Document Content]:\n${docText}\nUser Message:${promptText}`
        }
        userParts.push({text:promptText});
        if(image){
            userParts.push({
                inlineData:{
                    data:image.buffer.toString("base64"),
                    mimetype: image.mimetype
                }
            });
        }
        history.push({role:"user",parts:userParts});

        const result = await model.generateContent({contents:history});
        const botResponse = result.response.text();
        
        history.push({role:"model",parts:[{text:botResponse}]});
        return res.json({response:botResponse});
    }
    catch(error)
    {
       console.error("Error processing chat:",error);
       return res.status(500).json({error:"An error occured while processing your request"});
    }
});
app.post('/api/chat/reset',(req:any,res:any)=>{
    const {chatId}=req.body;
    if(chatId)
    {
        chatSessions.delete(chatId);
    }
    return res.json({success:true});
})
app.listen(port,()=>{
    console.log(`Backend server running on http://localhost:${port}`);
});

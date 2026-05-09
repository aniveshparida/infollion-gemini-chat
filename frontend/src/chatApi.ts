import axios from 'axios';

const API_URL= 'https://infollion-gemini-chat2.onrender.com/api';

export const sendMessage = async(chatId:string,message:string,document?:File|null,image?:File|null,signal?:AbortSignal)=>{
   const formData= new FormData();
   formData.append('chatId',chatId);
   formData.append('message', message);
   if(document)
   {
    formData.append('document',document);
   }
   if(image){
    formData.append('image',image);
   }

   const response = await axios.post(`${API_URL}/chat`,formData,{
     headers:{
        'Content-Type':'multipart/form-data',
     },
     signal,
   });
   return response.data;
};

export const deleteChat = async(chatId:string)=>{
  const response = await axios.post(`${API_URL}/chat/reset`, { chatId });
  return response.data;
};

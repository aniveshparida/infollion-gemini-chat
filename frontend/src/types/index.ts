export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  documentName?: string;
  imageName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
const data = new FormData();
data.append('chatId', 'test');
data.append('message', 'hello');
data.append('history', '[]');

fetch('https://infollion-gemini-chat2.onrender.com/api/chat', {
  method: 'POST',
  body: data
}).then(async res => {
  console.log('Status:', res.status, res.statusText);
  if (!res.ok) {
     console.log('Error Text:', await res.text());
     return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  return reader.read().then(function processText({ done, value }) {
    if (done) return;
    console.log('CHUNK:', decoder.decode(value));
    return reader.read().then(processText);
  });
}).catch(console.error);

const data = new FormData();
data.append('chatId', 'test');
data.append('message', 'hello');
data.append('history', '[]');

fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  body: data
}).then(res => {
  console.log('Status:', res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  return reader.read().then(function processText({ done, value }) {
    if (done) return;
    console.log(decoder.decode(value));
    return reader.read().then(processText);
  });
}).catch(console.error);

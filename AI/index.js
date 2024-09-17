const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

const knowledgeBaseId = '1836028464411652096';
const token = 'ece495abdd51dcc05bd3782a4fc44182.1LCU7JS2hRsxv30l';

function parseInput(message) {
   return JSON.stringify({
       model: 'glm-4-long',
       stream: true,
       temperature: 0.5,
       top_p: 0.5,
       tools: [{ type: 'retrieval', retrieval: { knowledge_id: knowledgeBaseId } }],
       messages: [
           { role: 'system', content: "你叫小艺，是销售人员的教练，能够帮助销售人员成长，擅长分析销售行业的问题，回答问题生动形象且认真仔细。" },
           { role: 'user', content: message }
       ]
   });
}

const server = http.createServer((req, res) => {
   const parsedUrl = url.parse(req.url, true);
   const path = parsedUrl.pathname;

   if (req.method === 'POST' && path === '/send') {
       let body = '';

       req.on('data', chunk => {
           body += chunk.toString();
       });

       req.on('end', () => {
           try {
               const message = JSON.parse(body).message;
               if (!message) {
                   throw new Error('Message is required');
               }

               res.setHeader('Content-Type', 'text/event-stream');
               res.setHeader('Cache-Control', 'no-cache');
               res.setHeader('Connection', 'keep-alive');
               res.flushHeaders();

               const options = {
                   hostname: 'open.bigmodel.cn',
                   path: '/api/paas/v4/chat/completions',
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`
                   }
               };

               const request = https.request(options, (response) => {
                   response.on('data', (chunk) => {
                       try {
                           const data = chunk.toString().replace('data:', '').trim();
                           const parsedData = JSON.parse(data);
                           if (parsedData.choices && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                               res.write(parsedData.choices[0].delta.content);
                           }
                       } catch (error) {
                           // Do nothing, just ignore parsing errors
                       }
                   });

                   response.on('end', () => {
                       res.end();
                   });
               });

               request.on('error', (error) => {
                   console.error(error);
                   res.writeHead(500, { 'Content-Type': 'text/plain' });
                   res.end('Server error occurred');
               });

               request.write(parseInput(message));
               request.end();
           } catch (error) {
               res.writeHead(400, { 'Content-Type': 'text/plain' });
               res.end('Invalid request');
           }
       });
   } else if (path === '/') {
       fs.readFile('index.html', (err, data) => {
           if (err) {
               res.writeHead(404, { 'Content-Type': 'text/plain' });
               res.end('Not Found');
           } else {
               res.writeHead(200, { 'Content-Type': 'text/html' });
               res.end(data);
           }
       });
   } else {
       res.writeHead(404, { 'Content-Type': 'text/plain' });
       res.end('Not Found');
   }
});

server.listen(5500, () => {
   console.log('Server running on port 5500');
});
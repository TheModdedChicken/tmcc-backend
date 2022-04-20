import cors from 'cors'
import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { AddressInfo } from 'net';
import { config } from 'dotenv';
import WebsocketBus from './classes/WebsocketBus';
config()

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });
export const WSBus = new WebsocketBus(wss);

app.use(cors({ origin: '*' }))
app.use(express.json())

app.all('/ping', (req, res) => {
  return res.status(200).send('pong')
})

server.listen(process.env.PORT || 4689, () => {
  console.log(`Server started on port ${(server.address() as AddressInfo).port}`);
});

process.on('exit', () => {
  wss.close()
  server.close()
})
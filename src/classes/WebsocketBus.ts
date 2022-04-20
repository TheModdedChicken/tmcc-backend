import * as WebSocket from 'ws';
import { IWebsocketClientData, IWebsocketCode, IWebsocketConn, IWebsocketServerData } from "../utility/interfaces";
import { GenerateUUID } from '../utility/util';

// Websocket Codes: https://www.iana.org/assignments/websocket/websocket.xhtml

export default class WebsocketBus {
  private WSServer: WebSocket.Server;
  private WSConnections: IWebsocketConn[] = [];

  constructor(wss: WebSocket.Server) { 
    this.WSServer = wss;
    this.WSServer.on('connection', (ws: WebSocket) => {
      this.handle(ws);
    })
  }

  handle (ws: WebSocket): string {
    const id = `${GenerateUUID()}`;
    const room = "general";
    const index = this.WSConnections.push({id: id, room, websocket: ws});
    this.send(id, {
      status: 200,
      code: "successful_connection",
      body: { id, room }
    })

    ws.on('message', (data) => this.messageHandler(id, data))
    ws.on('close', () => this.remove(id))

    return id;
  }

  send (id: string, data: IWebsocketServerData) {
    const WSConn = this.WSConnections.find(conn => conn.id === id)
    if (!WSConn) throw `Unable to find websocket connection with id ${id}`;

    WSConn.websocket.send(JSON.stringify(data))
  }

  remove (id: string) {
    this.WSConnections = this.WSConnections.filter(ws => ws.id !== id);
  }

  private messageHandler (id: string, dataBuffer: WebSocket.RawData) {
    const conn = this.WSConnections.find(conn => conn.id === id);
    if (!conn) return;

    try {
      const data: IWebsocketClientData = JSON.parse(dataBuffer.toString('utf-8'));
      try {
        if (data.code && data.code in this.WebsocketCodes) this.WebsocketCodes[data.code](conn, data);
        else throw {
          status: 515,
          message: "Invalid code",
          code: "invalid_code"
        }
      } catch (err: any) {
        console.log(err)
        conn.websocket.send(JSON.stringify(err))
      }
    } catch (err) {
      this.send(conn.id, {
        status: 415,
        message: "Invalid JSON",
        code: "json_invalid"
      })
    }
  }

  private WebsocketCodes: {[key: string | number | symbol]: IWebsocketCode} = {
    change_room: (conn: IWebsocketConn, data: IWebsocketClientData) => {
      if (!("room" in data.body) || !("room" in data.body)) throw {
        status: 515,
        message: "Invalid room",
        code: "invalid_room"
      }

      conn.room = data.body.room;

      return this.send(conn.id, {
        status: 200,
        code: "changed_room",
        body: {
          room: conn.room
        }
      })
    },
    send_message: (conn: IWebsocketConn, data: IWebsocketClientData) => {
      if (!("author" in data.body) || !("message" in data.body)) throw {
        status: 515,
        message: "Invalid body",
        code: "invalid_body"
      }

      const body = { author: data.body.author, message: data.body.message };

      for (const ws of this.WSConnections) {
        if (ws.room === conn.room && ws.id !== conn.id) this.send(ws.id, {
          status: 200,
          code: "new_message",
          body
        })
      }

      return this.send(conn.id, {
        status: 200,
        code: "sent_message",
        body
      })
    },
    user_count: (conn: IWebsocketConn, data: IWebsocketClientData) => {
      return this.send(conn.id, {
        status: 200,
        code: "user_count",
        body: { users: this.WSConnections.length }
      })
    }
  }
}
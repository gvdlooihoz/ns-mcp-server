#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JSONRPCMessage, Tool } from "@modelcontextprotocol/sdk/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpFunction } from "./functions/function.js";
import { GetDisruptionsFunction } from "./functions/getdisruptions.function.js";
import { GetTravelAdviceFunction } from "./functions/gettraveladvice.function.js";
import { GetOVFietsFunction } from "./functions/getovfiest.function.js";
import { GetStationInfoFunction } from "./functions/getstationinfo.function.js";
import { GetCurrentTimeFunction } from "./functions/getcurrenttime.function.js";
import { GetArrivalsFunction } from "./functions/getarrivals.function.js";
import { GetPricesFunction } from "./functions/getprices.function.js";
import { ApiKeyManager } from "./utils/apikeymanager.js";
import 'dotenv/config';
import { GetDeparturesFunction } from "./functions/getdeparturess.function.js";

export class NSServer {
  private mcpFunctions: Array<McpFunction> = [
    new GetDisruptionsFunction(), new GetTravelAdviceFunction(), new GetDeparturesFunction, new GetOVFietsFunction(),
    new GetStationInfoFunction(), new GetCurrentTimeFunction(), new GetArrivalsFunction(), new GetPricesFunction()
  ];
  private server: McpServer;
  private app = express();
  private transports: {[sessionId: string]: SSEServerTransport} = {};

  constructor() {
    this.server = new McpServer(
      {
          name: "NS MCP Service",
          version: "0.1.0",
      }, 
      {
          capabilities: { tools: {} },
      }
    );
    this.installTools(this.server);
  }

  private getTools(): Array<Tool> {
    const tools: Array<Tool> = [];
    for (const f in this.mcpFunctions) {
      const func = this.mcpFunctions[f];
      const name = func.name;
      const description = func.description;
      const inputSchema = func.inputschema;
      const tool: Tool = {
        name,
        description,
        inputSchema,
      }
      tools.push(tool);
    }
    return tools;
  }

  private installTools(server: McpServer): void {
    for (const f in this.mcpFunctions) {
      const func: McpFunction = this.mcpFunctions[f];
      server.tool(func.name, func.description, func.zschema, func.handleExecution);
    }
  }

  private installApp() {
    // Configure CORS middleware to allow all origins
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false,
      })
    );

    // Add a simple root route handler
    this.app.get("/", (req, res) => {
      res.json({
        name: "NS MCP SSE Server",
        version: "0.1.0",
        status: "running",
        endpoints: {
          "/": "Server information (this response)",
          "/sse": "Server-Sent Events endpoint for MCP connection",
          "/messages": "POST endpoint for MCP messages",
        },
        tools: this.getTools(),
      });
    });

    function hasMethod(obj: any, methodName: string) {
      return obj && typeof obj[methodName] === 'function';
    }

    this.app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      this.transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete this.transports[transport.sessionId];
        if (hasMethod(transport, 'close')) {
          try {
            transport.close();
          } catch (closeError) {
            console.error(`Error closing transport for session ${transport.sessionId}:`, closeError);
          }
        }
      });
      await this.server.connect(transport);

      const pingInterval = setInterval(() => {
        // Check if the response is still writable and the transport is still in our lookup
        if (res.writableEnded || !this.transports[transport.sessionId]) {
          console.log(`Clearing ping interval for session: ${transport.sessionId} (connection closed)`);
          clearInterval(pingInterval);
          return;
        }
  
        try {
          // Check if the transport is still connected before sending
          // We can do this by checking if the transport is still in our lookup
          if (this.transports[transport.sessionId] && hasMethod(transport, 'send')) {
            // Additional check to see if the transport has a valid response
            // This is an internal implementation detail of SSEServerTransport
            // but we can check it safely with optional chaining
            const ping: JSONRPCMessage = {
              "jsonrpc": "2.0",
              "id": "123",
              "method": "ping"
            };
            transport.send(ping);
          } else {
            if (!res.writableEnded) {
              res.write(`:ping\n\n`);
            } else {
              console.log(`Response for session ${transport.sessionId} is no longer writable, clearing interval`);
              clearInterval(pingInterval);
            }
          }
        } catch (pingError) {
          console.error(`Error sending ping for session ${transport.sessionId}:`, pingError);
          clearInterval(pingInterval);
          // Clean up the transport from our lookup if we can't send to it
          delete this.transports[transport.sessionId];
        }
      }, 10000);
    });

    this.app.post("/messages", async (req, res) => {
      // Note: to support multiple simultaneous connections, these messages will
      // need to be routed to a specific matching transport. (This logic isn't
      // implemented here, for simplicity.)
      const headers = req.headers;
      const sessionId = req.query.sessionId as string;
      const transport = this.transports[sessionId];
      if (headers) {
        if (headers.authorization && headers.authorization.startsWith("Bearer")) {
          const apiKey = headers.authorization.substring(7, headers.authorization.length);
          ApiKeyManager.setApiKey(sessionId, apiKey);
        }
      }
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send('No transport found for sessionId');
      }
    });
  }

  async run(): Promise<void> {
    const PORT = process.env.PORT || 3003;
    this.installApp();
    this.app.listen(PORT, () => {
      console.log(`NS MCP SSE Server running on port ${PORT}`);
    });  
  }
}


  




import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetStationInfoFunction implements McpFunction {

    public name: string = "get_station_info";

    public description: string = "Get detailed information about a train station." ;

    public inputschema = {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Station name or code to search for',
          },
          includeNonPlannableStations: {
            type: 'boolean',
            description: 'Include stations where trains do not stop regularly',
            default: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            minimum: 1,
            maximum: 50,
            default: 10
          }
        },
        required: ['query']
      };

    public zschema = { query: z.string(), includeNonPlannableStations: z.boolean(), limit: z.number() };

    public async handleExecution(args: any, extra: any) {
        try {
            const sessionId = extra.sessionId;
            let apiKey: string | undefined;
            if (sessionId) {
                apiKey = ApiKeyManager.getApiKey(sessionId);
                console.log("Api Key from ApiKeyManager: " + apiKey);
            } else {
                apiKey = process.env.NS_API_KEY;
                console.log("Api Key from environment variable: " + apiKey);
            }
            if (!apiKey || apiKey.trim() === "") {
                throw new Error("No NS_API_KEY provided. Cannot authorize NS API.")
            }
            if (args && !args.query) {
                throw new Error("Parameter query is needed to seach for station.");
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getStationInfo(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
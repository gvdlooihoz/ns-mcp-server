import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetArrivalsFunction implements McpFunction {

    public name: string = "get_arrivals";

    public description: string = "Get real-time arrival information for trains at a specific station, including platform numbers, delays, origin stations, and any relevant travel notes. " + 
        " Returns a list of upcoming arrivals with timing, origin, and status information.";

    public inputschema = {
        type: 'object',
        properties: {
          station: {
            type: 'string',
            description: 'NS Station code for the station (e.g., ASD for Amsterdam Centraal). Required if uicCode is not provided',
          },
          uicCode: {
            type: 'string',
            description: 'UIC code for the station. Required if station code is not provided',
          },
          dateTime: {
            type: 'string',
            description: 'Format - date-time (as date-time in RFC3339). Only supported for arrivals at foreign stations. Defaults to server time (Europe/Amsterdam)',
          },
          maxJourneys: {
            type: 'number',
            description: 'Number of arrivals to return',
            minimum: 1,
            maximum: 100,
            default: 40
          },
          lang: {
            type: 'string',
            description: 'Language for localizing the arrivals list. Only a small subset of text is translated, mainly notes. Defaults to Dutch',
            enum: ['nl', 'en'],
            default: 'nl'
          }
        },
        oneOf: [
          { required: ['station'] },
          { required: ['uicCode'] }
        ]
    };

    public zschema = { station: z.string().optional(), uicCode: z.string().optional(), dateTime: z.string().optional(), maxJourneys: z.number().optional(), lang: z.string().optional() };

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
            if (args) {
                if (!args.station && !args.uicCode) {
                    throw new Error("One of the parameters station or uicCode is needed to get the departures at a station.");
                }
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getArrivals(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetTravelAdviceFunction implements McpFunction {

    public name: string = "get_travel_advice";

    public description: string = "Get detailed travel routes between two train stations, including transfers, real-time updates, platform information, and journey duration." +
        " You can plan trips for immediate departure or for a specific departure time in the future, with options to optimize for arrival time. " +
        " Returns multiple route options with status and crowding information." ;

    public inputschema = {
        type: 'object',
        properties: {
            fromStation: {
            type: 'string',
            description: 'Name or code of departure station',
            },
            toStation: {
            type: 'string',
            description: 'Name or code of destination station',
            },
            dateTime: {
            type: 'string',
            description: 'Format - date-time (as date-time in RFC3339). Datetime that the user want to depart from his origin or or arrive at his destination',
            },
            searchForArrival: {
            type: 'boolean',
            description: 'If true, dateTime is treated as desired arrival time otherwise as desired arrival time',
            },
        },
        required: ['fromStation', 'toStation'],
    };

    public zschema = { fromStation: z.string(), toStation: z.string(), dateTime: z.string().optional(), searchForArrival: z.boolean().optional() };

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
                if (!args.fromStation) {
                    throw new Error("Parameter fromStation is needed to get travel advice.");
                }
                if (!args.toStation) {
                    throw new Error("Parameter toStation is needed to get travel advice.");
                }
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getTravelAdvice(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
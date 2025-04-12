import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetDisruptionsFunction implements McpFunction {

    public name: string = "get_disruptions";

    public description: string = "Get comprehensive information about current and planned disruptions on the Dutch railway network." + 
      " Returns details about maintenance work, unexpected disruptions, alternative transport options, impact on travel times, and relevant advice. "+
      " You can filter for active disruptions and specific disruption types."

    public inputschema = {
        type: 'object',
        properties: {
            isActive: {
                type: 'boolean',
                description: 'Filter to only return active disruptions',
            },
            type: {
                type: 'string',
                description: 'Type of disruptions to return (e.g., MAINTENANCE, DISRUPTION)',
                enum: ['MAINTENANCE', 'DISRUPTION']
            }
        }
    };

    public zschema = { isActive: z.boolean().optional(), type: z.string().optional() };

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
            if (args && args.type) {
                if (!(args.type === 'MAINTENANCE' || args.type === 'DISRUPTION')) {
                    throw new Error("Wrong value for disruption type. Should be MAINTENANCE or DISRUPTION.");
                }
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getDisruptions(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
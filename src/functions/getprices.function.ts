import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetPricesFunction implements McpFunction {

    public name: string = "get_prices";

    public description: string = "Get price information for domestic train journeys, including different travel classes, ticket types, and discounts. " + 
        " Returns detailed pricing information with conditions and validity.";

    public inputschema = {
        type: 'object',
        properties: {
          fromStation: {
            type: 'string',
            description: 'UicCode or station code of the origin station',
          },
          toStation: {
            type: 'string',
            description: 'UicCode or station code of the destination station',
          },
          travelClass: {
            type: 'string',
            description: 'Travel class to return the price for',
            enum: ['FIRST_CLASS', 'SECOND_CLASS']
          },
          travelType: {
            type: 'string',
            description: 'Return the price for a single or return trip',
            enum: ['single', 'return'],
            default: 'single'
          },
          isJointJourney: {
            type: 'boolean',
            description: 'Set to true to return the price including joint journey discount',
            default: false
          },
          adults: {
            type: 'integer',
            description: 'Number of adults to return the price for',
            minimum: 1,
            default: 1
          },
          children: {
            type: 'integer',
            description: 'Number of children to return the price for',
            minimum: 0,
            default: 0
          },
          routeId: {
            type: 'string',
            description: 'Specific identifier for the route to take between the two stations. This routeId is returned in the /api/v3/trips call.'
          },
          plannedDepartureTime: {
            type: 'string',
            description: 'Format - date-time (as date-time in RFC3339). Used to find the correct route if multiple routes are possible.'
          },
          plannedArrivalTime: {
            type: 'string',
            description: 'Format - date-time (as date-time in RFC3339). Used to find the correct route if multiple routes are possible.'
          }
        },
        required: ['fromStation', 'toStation']
      };

    public zschema = { fromStation: z.string(), toStation: z.string(), travelClass: z.string(), travelType: z.string(), isJointJourney: z.boolean(), adults: z.number(), childres: z.number(), routeId: z.string(), plannedDepartureTime: z.string(), plannedArrivalTime: z.string() };

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
            if (args && (!args.fromStation || !args.toStation)) {
                throw new Error("Parameters fromStation and toStation are needed to get price information.");
            }
            if (args && !(args.travelClass === "FIRST_CLASS" || args.travelClass === "SECOND_CLASS")) {
                throw new Error("Parameter travelClass needs value FIRST_CLASS or SECOND_CLASS.");
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getPrices(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
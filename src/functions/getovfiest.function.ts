import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetOVFietsFunction implements McpFunction {

    public name: string = "get_ovfiets";

    public description: string = "Get OV-fiets (bikes) availability at a train station" ;

    public inputschema = {
        type: 'object',
        properties: {
          stationCode: {
            type: 'string',
            description: 'Station code to check OV-fiets availability for (e.g., ASD for Amsterdam Centraal)',
          }
        },
        required: ['stationCode']
    };

    public zschema = { stationCode: z.string() };

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
                if (!args.stationCode) {
                    throw new Error("Parameter stationCode is needed to get information on availability of bikes at the station.");
                }
            }
            const nsApiService = new NSApiService(apiKey);
            const data = await nsApiService.getOVFiets(args);
            return ResponseFormatter.formatSuccess(data);
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
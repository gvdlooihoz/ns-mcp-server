import { ApiKeyManager } from "../utils/apikeymanager.js";
import { McpFunction } from "./function.js";
import { z } from "zod";
import { ResponseFormatter } from '../utils/ResponseFormatter.js';
import { NSApiService } from '../services/NSApiService.js';

export class GetCurrentTimeFunction implements McpFunction {

    public name: string = "get_current_time_in_rfc3339";

    public description: string = "Get the current server time (Europe/Amsterdam timezone) in RFC3339 format. " +
        " This can be used as input for other tools that require date-time parameters." ;

    public inputschema = {
        type: 'object',
        properties: {}
      };

    public zschema = {};

    public async handleExecution(args: any, extra: any) {
        try {
            const now = new Date();
            return ResponseFormatter.formatSuccess({
              datetime: now.toISOString(),
              timezone: 'Europe/Amsterdam'
            });
        } catch (error) {
            return ResponseFormatter.formatError(error);
        }
    }
}
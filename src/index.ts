#!/usr/bin/env node
import { NSServer } from './nsserver.js';

const server = new NSServer();
server.run().catch(console.error);
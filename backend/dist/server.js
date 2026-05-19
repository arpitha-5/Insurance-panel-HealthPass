"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 5000;
const server = app_1.default.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 HEALTHPASS B2B INSURANCE GATEWAY IS ACTIVE AND READY!   `);
    console.log(`📡 PORT: http://localhost:${PORT}                          `);
    console.log(`🛡️  MODE: Development / Enterprise Demonstration            `);
    console.log(`===========================================================`);
});
// Graceful shutdowns
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM signal received. Commencing graceful database teardown...');
    server.close(() => {
        console.log('🛑 Server closed. Processes terminated.');
    });
});

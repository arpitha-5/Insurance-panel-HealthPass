"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
// Import route modules
const auth_controller_1 = __importDefault(require("./modules/auth/auth.controller"));
const insurer_controller_1 = __importDefault(require("./modules/insurer/insurer.controller"));
const policies_controller_1 = __importDefault(require("./modules/policies/policies.controller"));
const claims_controller_1 = __importDefault(require("./modules/claims/claims.controller"));
const ai_controller_1 = __importDefault(require("./modules/ai/ai.controller"));
const analytics_controller_1 = __importDefault(require("./modules/analytics/analytics.controller"));
dotenv.config();
const app = (0, express_1.default)();
// Configure CORS to support seamless frontend dashboard requests
app.use((0, cors_1.default)({
    origin: '*', // Allow all in development/demo mode
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health Check API
app.get('/health', (req, res) => {
    res.json({
        status: 'ONLINE',
        service: 'HealthPass Insurance Partner Panel API Gateway',
        timestamp: new Date()
    });
});
// Register API Routes
app.use('/api/auth', auth_controller_1.default);
app.use('/api/insurer', insurer_controller_1.default);
app.use('/api/policies', policies_controller_1.default);
app.use('/api/claims', claims_controller_1.default);
app.use('/api/ai', ai_controller_1.default);
app.use('/api/analytics', analytics_controller_1.default);
// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Exception:', err);
    res.status(err.status || 500).json({
        error: err.message || 'A severe unhandled exception occurred within the application gateway.'
    });
});
exports.default = app;

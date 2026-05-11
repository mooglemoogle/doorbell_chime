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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_status_codes_1 = require("http-status-codes");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)();
const index_1 = __importDefault(require("./routes/index"));
const app = (0, express_1.default)();
app.use((0, express_1.json)(), (0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    optionsSuccessStatus: http_status_codes_1.StatusCodes.OK,
}));
app.use((0, index_1.default)());
app.use(express_1.default.static((0, path_1.resolve)(__dirname, '../../client/dist')));
app.use('*', (req, res) => {
    res.status(http_status_codes_1.StatusCodes.NOT_FOUND).send('404 Not Found');
});
app.listen(process.env.APP_PORT, () => {
    console.log(`Light Control listening on port ${process.env.APP_PORT}`);
});
//# sourceMappingURL=index.js.map
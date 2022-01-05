"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const actions_1 = __importDefault(require("./actions"));
exports.default = () => {
    const router = express_1.Router();
    actions_1.default(router);
    return router;
};
//# sourceMappingURL=index.js.map
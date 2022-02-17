"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const zeromq_1 = require("zeromq");
const sock = new zeromq_1.Request();
sock.connect('tcp://localhost:5555');
const isCommandResponse = (response) => {
    return response.accepted !== undefined;
};
let sendLock = Promise.resolve('');
const sendCommand = (command, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const message = Object.assign({ command }, options);
    sendLock = sendLock.then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield sock.send(JSON.stringify(message));
        const [result] = yield sock.receive();
        try {
            const resultObj = JSON.parse(result.toString('utf-8'));
            return resultObj;
        }
        catch (_a) {
            return result.toString('utf-8');
        }
    }));
    return sendLock;
});
const VALID_COMMANDS = ['on', 'off', 'next'];
exports.default = (router) => {
    router.get('/api/actions/get_status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield sendCommand('get_status');
        if (isCommandResponse(result) && result.accepted) {
            res.status(200);
            res.send(result);
        }
        else {
            res.status(400);
            res.send(result);
        }
    }));
    router.get('/api/actions/get_cycles', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield sendCommand('get_cycles');
        if (isCommandResponse(result) && result.accepted) {
            res.status(200);
            res.send(result);
        }
        else {
            res.status(400);
            res.send(result);
        }
    }));
    router.post('/api/actions/set_brightness/:new_brightness', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield sendCommand('set_brightness', { brightness: req.params.new_brightness });
        if (isCommandResponse(result) && result.accepted) {
            res.status(202);
            res.send(result);
        }
        else {
            res.status(400);
            res.send(result);
        }
    }));
    router.post('/api/actions/set_cycle/:new_cycle', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield sendCommand('set_cycle', { name: req.params.new_cycle });
        if (isCommandResponse(result) && result.accepted) {
            res.status(202);
            res.send(result);
        }
        else {
            res.status(400);
            res.send(result);
        }
    }));
    router.post('/api/actions/:command', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const command = req.params.command.toLowerCase();
        if (VALID_COMMANDS.includes(command)) {
            const result = yield sendCommand(command);
            if (isCommandResponse(result) && result.accepted) {
                res.status(202);
                res.send(result);
            }
            else {
                res.status(400);
                res.send(result);
            }
        }
        else {
            res.status(404);
            res.send('Command not found');
        }
    }));
};
//# sourceMappingURL=actions.js.map
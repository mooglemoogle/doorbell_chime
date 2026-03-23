import * as zmq from "zeromq";

export interface Command {
    command: string;
    [key: string]: unknown;
}

const AVAILABLE_COMMANDS = ["next", "off", "on", "set_brightness", "set_cycle", "get_status", "get_cycles"] as const;

export class CommandWatcher {
    commandsReceived: Command[] = [];
    private readonly socket: zmq.Reply;
    // Track the pending reply function for the current in-flight request
    private pendingReply: ((response: unknown) => Promise<void>) | null = null;

    constructor(port = 5555) {
        this.socket = new zmq.Reply();
        this.socket.bind(`tcp://*:${port}`).then(() => {
            console.log(`ZMQ socket bound on port ${port}`);
            this.receiveLoop();
        });
    }

    private async receiveLoop(): Promise<void> {
        for await (const [msgBuffer] of this.socket) {
            let message: Command;
            try {
                message = JSON.parse(msgBuffer.toString()) as Command;
            } catch {
                await this.socket.send(JSON.stringify({ accepted: false, message: "Invalid JSON" }));
                continue;
            }

            const command = message.command ?? "";
            if (!(AVAILABLE_COMMANDS as readonly string[]).includes(command)) {
                await this.socket.send(JSON.stringify({ accepted: false, message: "Command not recognized" }));
                continue;
            }

            // Park the reply capability and enqueue for main loop processing
            let resolveReply!: (response: unknown) => void;
            const replyPromise = new Promise<unknown>((resolve) => {
                resolveReply = resolve;
            });

            this.pendingReply = async (response: unknown) => {
                resolveReply(response);
            };
            this.commandsReceived.push(message);

            // Wait for the main loop to call markComplete before accepting the next message
            const response = await replyPromise;
            await this.socket.send(JSON.stringify({ accepted: true, response }));
            this.pendingReply = null;
        }
    }

    checkMessages(): void {
        // Queue is already populated by receiveLoop — nothing to do here
    }

    async markComplete(message: Command, response: unknown = null): Promise<void> {
        const idx = this.commandsReceived.indexOf(message);
        if (idx !== -1) this.commandsReceived.splice(idx, 1);
        if (this.pendingReply) await this.pendingReply(response);
    }

    destroy(): void {
        this.socket.close();
    }
}

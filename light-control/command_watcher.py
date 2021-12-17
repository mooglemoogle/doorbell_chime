import json
import logging
from typing import List
import zmq

class CommandWatcher:
    def __init__(self, available_commands: List[str], queue_port=5555):
        self.commands_received = []
        self._available_commands = available_commands
        self.__logger = logging.getLogger()
        self.__initialize_queue(queue_port)
    
    def destroy(self):
        self.__poller.unregister(self.__socket)
        self.__socket.close()
        self.__context.destroy()
    
    def __initialize_queue(self, port):
        self.__poller = zmq.Poller()
        self.__context = zmq.Context()
        self.__socket = self.__context.socket(zmq.REP)
        self.__socket.bind('tcp://*:{0}'.format(port))
        self.__poller.register(self.__socket, zmq.POLLIN)

        self.__logger.log(logging.INFO, 'socket bound')

    def check_messages(self):
        results = self.__poller.poll(0)

        for socket, event_mask in results:
            if event_mask == zmq.POLLIN:
                message = socket.recv_json(zmq.DONTWAIT)
                self.handle(message)

    def handle(self, message):
        self.__logger.log(logging.DEBUG, 'Message received %s', message)
        
        command = message['command'] if 'command' in message else ''
        if command in self._available_commands:
            if command not in self.commands_received:
                self.commands_received.append(command)
            self.__socket.send_json({
                'accepted': True,
                'message': 'Good Job',
            })
        else:
            self.__socket.send_json({
                'accepted': False,
                'message': 'Command not recognized',
            })

    def mark_complete(self, command:str):
        self.commands_received.remove(command)
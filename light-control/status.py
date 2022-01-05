import json
import logging
import os.path
from debounce import debounce

default_status = {
    "brightness": 0.5,
    "transition_time": 2000,
    "running": False,
    "current_cycle": "Default"
}

class Status:
    def __init__(self, status_file_path='./status.json'):
        self.properties = {}
        self.__logger = logging.getLogger()
        self.set_status_file_path(status_file_path)
        self.__load_status_file()

    def set_status_file_path(self, path):
        self.__status_file_path = path

    def reload(self):
        self._debounced_load()
    
    def get_value(self, key):
        return self.properties[key]
    
    def set_value(self, key, value):
        self.properties[key] = value
        self.__save_status_file()

    @debounce(0.5)
    def __save_status_file(self):
        self.__logger.log(logging.DEBUG, 'Saving current status')
        with open(self.__status_file_path, 'w') as f:
            f.write(json.dumps(self.properties, indent=4))

        self.__logger.log(logging.DEBUG, 'Status saved!')

    def __load_status_file(self):
        self.__logger.log(logging.DEBUG, 'Loading existing status')
        if not os.path.exists(self.__status_file_path):
            data = default_status
        else:
            with open(self.__status_file_path, 'r') as json_config:
                data = json.load(json_config)

        for key in default_status.keys():
            if (key in data):
                self.properties[key] = data[key]
            else:
                self.properties[key] = default_status[key]

        self.__logger.log(logging.DEBUG, 'Status loaded!')

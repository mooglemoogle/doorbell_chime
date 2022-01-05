import json
import logging
import time

class Cycle:
    def __init__(self, cycle_config_path):
        self.__logger = logging.getLogger()
        self.set_cycle_config_path(cycle_config_path)
        self.__load_cycle_config()

    def set_cycle_config_path(self, path):
        self.__cycle_config_path = path

    def __load_cycle_config(self):
        self.__logger.log(logging.DEBUG, 'Loading cycle from file %s', self.__cycle_config_path)
        time.sleep(0.1)
        with open(self.__cycle_config_path, 'r') as json_config:
            data = json.load(json_config)

        self.name = data['name']
        self.cycles = data['cycles']
        
        self.__logger.log(logging.DEBUG, 'Cycle named %s loaded!', )

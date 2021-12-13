import json
import logging
import time
from watchdog.observers import Observer
from config import ConfigWatcher

class Cycle:
    def __init__(self, cycle_config_path='./cycle.json'):
        self.properties = {}
        self.__logger = logging.getLogger()
        self.set_cycle_config_path(cycle_config_path)
        self.__initialize_observer()
        self.__load_cycle_config()
        self.updated = False

    def set_cycle_config_path(self, path):
        self.__cycle_config_path = path

    def reload(self):
        self.__load_cycle_config()
        self.updated = True
    
    def get_value(self, key):
        return self.properties[key]
    
    def destroy(self):
        self.__observer.stop()
        self.__observer.join()
    
    def __initialize_observer(self):
        self.__handler = ConfigWatcher(self.__cycle_config_path, self)
        self.__observer = Observer()
        self.__observer.schedule(self.__handler, self.__cycle_config_path)
        self.__observer.start()

    def __load_cycle_config(self):
        self.__logger.log(logging.DEBUG, 'Config file %s updated. Loading parameters', self.__cycle_config_path)
        time.sleep(0.1)
        with open(self.__cycle_config_path, 'r') as json_config:
            data = json.load(json_config)

        self.cycles = data
        
        self.__logger.log(logging.DEBUG, 'Config parameters updated!')

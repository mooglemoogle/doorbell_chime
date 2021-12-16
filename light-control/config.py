import json
import logging
import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from debounce import debounce

class ConfigWatcher(FileSystemEventHandler):
    def __init__(self, config_path, watcher):
        self.__config_path = os.path.abspath(config_path)
        self.__watcher = watcher
        super()

    def on_modified(self, event):
        if not event.is_directory and event.src_path == self.__config_path:
            self.__watcher.reload()
        return super().on_modified(event)

class Config:
    def __init__(self, config_file_path='./config.json'):
        self.properties = {}
        self.__logger = logging.getLogger()
        self.set_config_file_path(config_file_path)
        self.__initialize_observer()
        self.__load_config_file()
        self.updated = False

    def set_config_file_path(self, path):
        self.__config_file_path = path

    def reload(self):
        self._debounced_load()
    
    def get_value(self, key):
        return self.properties[key]
    
    def destroy(self):
        self.__observer.stop()
        self.__observer.join()
    
    def __initialize_observer(self):
        path = os.path.dirname(self.__config_file_path)
        self.__handler = ConfigWatcher(self.__config_file_path, self)
        self.__observer = Observer()
        self.__observer.schedule(self.__handler, path)
        self.__observer.start()

    @debounce(0.1)
    def _debounced_load(self):
        self.__load_config_file()
        self.updated = True

    def __load_config_file(self):
        self.__logger.log(logging.DEBUG, 'Config file %s updated. Loading parameters', self.__config_file_path)
        with open('config.json', 'r') as json_config:
            data = json.load(json_config)

        for key, value in data.items():
            self.properties[key] = value

        self.__logger.log(logging.DEBUG, 'Config parameters updated!')



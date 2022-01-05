import json
import logging
import os.path

class LightConfig:
    def __init__(self, light_config_file_path='./light_config.json'):
        self.light_strips = []
        self.__logger = logging.getLogger()
        self.set_light_config_file_path(light_config_file_path)
        self.__load_light_config_file()

    def set_light_config_file_path(self, path):
        self.__light_config_file_path = path

    def num_strips(self):
        return len(self.light_strips)

    def get_light_strip(self, index):
        return self.light_strips[index]

    def __load_light_config_file(self):
        self.__logger.log(logging.DEBUG, 'Loading light config')
        if not os.path.exists(self.__light_config_file_path):
            raise Exception('Light Strip config required at light_config.json. See light_config_sample.json for an example')
        else:
            with open(self.__light_config_file_path, 'r') as json_config:
                data = json.load(json_config)
                self.light_strips = data['light_strips']

        self.__logger.log(logging.DEBUG, 'Light config loaded!')

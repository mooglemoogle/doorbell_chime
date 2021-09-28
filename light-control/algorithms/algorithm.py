import logging
import neopixel
import board

import Pixel from algorithms.pixel

def get_config_props(config):
    return {
        'pin': config.get_value('gpio_pin'),
        'num_pixels': config.get_value('num_lights'),
        'bpp': config.get_value('bpp'),
        'order': config.get_value('order'),
    }

class Algorithm:
    def __init__(self, name, config) -> None:
        self.logger = logging.getLogger(__name__)
        self.name = name
        self.__config = config

        self.__latest_config = get_config_props(config)
        self.__create_pixels()
        self.__store_settings()

        self.__alg_config = self.__config.alg_map[name]

    def __create_pixels(self):
        self.pixels = neopixel.NeoPixel(
            getattr(board, self.__latest_config['pin']),
            self.__latest_config['num_pixels'],
            bpp=self.__latest_config['bpp'],
            pixel_order=getattr(neopixel, self.__latest_config['order']),
            auto_write=False
        )
    
    def __store_settings(self):
        self.__settings = self.__config.get_value('selected_options')
        if not self.__settings:
            self.__settings = self.__alg_config['options']['default']

    def settings(self):
        return self.__settings

    def run_cycle(self):
        if self.__config.updated:
            self.__latest_config = get_config_props(self.__config)
            self.__create_pixels()
            self.__store_settings()

    def stop(self):
        self.pixels.fill(0x000000)
        self.pixels.show()

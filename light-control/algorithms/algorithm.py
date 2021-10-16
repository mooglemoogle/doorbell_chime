import logging
from algorithms.pixel import Pixel
from algorithms.helpers import get_millis

class Algorithm:
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        self.logger = logging.getLogger(__name__)
        self.logger.log(logging.INFO, f'Initializing algorithm {name:s}')
        self.name = name
        self.config = alg_config
        self.__settings = settings
        self.__last_cycle_time = 0

        self.pixels = [Pixel() for _ in range(num_pixels)]
    
    def refresh_rate(self):
        return self.config['refresh_rate']

    def settings(self):
        return self.__settings

    def run_cycle(self, elapsed_millis:float, elapsed_seconds:float) -> bool:
        pass

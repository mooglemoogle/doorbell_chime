import logging
from .pixel import Pixel
from .helpers import get_millis

class BaseAlgorithm:
    def __init__(self, num_pixels, alg_config, settings) -> None:
        self.logger = logging.getLogger(__name__)
        self.name = alg_config['name']
        self.logger.log(logging.INFO, f'Initializing algorithm {self.name:s}')
        self.config = alg_config
        self.__settings = settings
        self.__last_cycle_time = 0

        self.pixels = [Pixel() for _ in range(num_pixels)]
    
    def refresh_rate(self):
        return self.__settings.get('refresh_rate', self.config['refresh_rate'])

    def settings(self):
        return self.__settings

    def run_cycle(self, elapsed_millis:float, elapsed_seconds:float) -> bool:
        pass

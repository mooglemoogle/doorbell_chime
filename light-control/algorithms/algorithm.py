import logging
from algorithms.pixel import Pixel

class Algorithm:
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        self.logger = logging.getLogger(__name__)
        self.name = name
        self.config = alg_config
        self.__settings = settings

        self.pixels = [Pixel() for _ in range(num_pixels)]
    
    def refresh_rate(self):
        return self.config['refresh_rate']

    def settings(self):
        return self.__settings

    def refresh_rate(self):
        return self.config.refresh_rate

    def run_cycle(self):
        pass

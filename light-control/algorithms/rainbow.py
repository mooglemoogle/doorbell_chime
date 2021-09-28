import colorsys
import json
import logging

from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, config) -> None:
        super().__init__(name, config)
        self.pixel_hues = [(0.1 * (n % 10)) for n in range(self.__latest_config['num_pixels'])]
    
    def run_cycle(self):
        brightness = self.__config.get_value('brightness')
        max_val = 255 * brightness
        speed = self.settings()['speed']
        multiplier = -0.1 if self.settings()['reverse'] else 0.1
        for i in range(len(self.pixel_hues)):
            cur_hue = self.pixel_hues[i]
            nc = colorsys.hsv_to_rgb(cur_hue, 1.0, 0.5)
            
            self.pixels[i] = (nc[0] * max_val, nc[1] * max_val, nc[2] * max_val)
            new_hue = cur_hue + (multiplier * (speed / 100))
            if new_hue > 1.0:
                new_hue = 0
            elif new_hue < 0.0:
                new_hue = 1.0
            self.pixel_hues[i] = new_hue
        
        # self.pixels.show()
        self.logger.log(logging.INFO, json.dumps(['{:0.2f}'.format(x) for x in self.pixel_hues]))
        return super().run_cycle()

# import json
# import logging

from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, config) -> None:
        super().__init__(name, config)
        for n in range(len(self.pixels)):
            pixel = self.pixels[n]
            pixel.hue = (0.1 * (n % 10))
            pixel.sat = 1.0
            pixel.val = 1.0
    
    def run_cycle(self):
        speed = self.settings()['speed']
        multiplier = -0.1 if self.settings()['reverse'] else 0.1
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            new_hue = pixel.hue + (multiplier * (speed / 100))
            if new_hue > 1.0:
                new_hue = 0
            elif new_hue < 0.0:
                new_hue = 1.0
            pixel.hue = new_hue
        
        # self.pixels.show()
        # self.logger.log(logging.INFO, json.dumps(['{:0.2f}'.format(x) for x in self.pixel_hues]))
        return super().run_cycle()

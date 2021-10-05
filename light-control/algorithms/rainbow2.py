# import json
# import logging
import math

from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)
        self.num = len(self.pixels)
        middle = self.num / 2
        floor_middle = math.floor(middle)
        center_indices = []
        if middle != floor_middle: # Odd number of pixels
            # for 11 pixels, we want the 6th pixel to be the middle
            # so we have 5 pixels on either side with one center
            # So 11 / 2 = 5.5. Center should be index 5
            center_indices.append(floor_middle)
        else:
            # for 10 pixels, we want the center to be between
            # pixels 5 and 6. They will be the same. So indices
            # 4 and 5
            center_indices.append(middle - 1)
            center_indices.append(middle)
        num_outside = (self.num - len(center_indices)) / 2 # this should always be even
        increase_per_pixel = 1.0 / num_outside
        for n in range(len(self.pixels)):
            pixel = self.pixels[n]
            if n in center_indices:
                pixel.hue = 0.0
            elif n < middle:
                # 11 pixels, pixel 5 should be 0.2, one away from center
                # num_outside is 5, index is 4 num_outside - index * increase
                pixel.hue = (num_outside - n) * increase_per_pixel
            else:
                # 11 pixels, pixel 7 should be 0.2, one away from center
                # center_indices[-1] will be 5, n is 6
                pixel.hue = (n - center_indices[-1]) * increase_per_pixel
            pixel.sat = 1.0
            pixel.val = 1.0
    
    def run_cycle(self):
        speed = self.settings()['speed']
        multiplier = -0.1 if self.settings()['reverse'] else 0.1
        for i in range(self.num):
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

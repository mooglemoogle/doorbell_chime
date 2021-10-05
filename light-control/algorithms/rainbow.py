import logging

from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)
        per_item = 1.0 / num_pixels
        for n in range(num_pixels):
            pixel = self.pixels[n]
            pixel.hue = per_item * n
            pixel.sat = 1.0
            pixel.val = 1.0
    
    def run_cycle(self, _, elapsed_seconds):
        # self.logger.log(logging.DEBUG, f'millis: {_:.3f} seconds: {elapsed_seconds:.3f}')
        speed = self.settings()['speed'] / 360.0
        # self.logger.log(logging.DEBUG, f'speed: {speed:.3f}')
        reverser = -1 if self.settings()['reverse'] else 1
        to_move = speed * elapsed_seconds * reverser
        # self.logger.log(logging.DEBUG, f'to_move: {to_move:.3f}')
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            new_hue = pixel.hue + to_move
            if new_hue > 1.0:
                new_hue -= 1.0
            elif new_hue < 0.0:
                new_hue += 1.0
            pixel.hue = new_hue
        
        return super().run_cycle(_, elapsed_seconds)

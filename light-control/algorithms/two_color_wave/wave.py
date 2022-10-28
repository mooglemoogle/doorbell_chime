import logging
import math
import time
from .config import config
from .._meta import BaseAlgorithm
from .._meta.pixel import Pixel

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        self.reversed = 1 if settings['reverse'] else -1
        self.speed = settings['speed']
        self.square = 'square' in settings and settings['square']
        
        multiplier = math.tau / settings['wavelength']
        split = 'split' in settings and settings['split']
        if not split:
            self.locs = [n * multiplier for n in range(len(self.pixels))]
        else:
            center = (len(self.pixels) / 2) - 0.5
            self.locs = [math.fabs((n - center) * multiplier) for n in range(len(self.pixels))]

        colors = settings['colors']
        self.base_color = Pixel(colors[0][0], colors[0][1], colors[0][2])
        self.diff = Pixel(colors[1][0], colors[1][1], colors[1][2]).diff(self.base_color)


        self.start_time = 0
        self.run_cycle(0, 0)
        self.start_time = 0
    
    def run_cycle(self, elapsed_millis, elapsed_seconds):
        cur_time = time.time()
        if self.start_time == 0:
            self.start_time = cur_time

        phase = (((cur_time - self.start_time) % self.speed) / self.speed) * self.reversed * math.tau

        for n in range(len(self.pixels)):
            loc = self.locs[n]
            pixel = self.pixels[n]

            pos = (math.cos(loc + phase) + 1) / 2
            if self.square:
                if pos > 0.5: pos = 1
                else: pos = 0
            

            hue = self.diff.hue * pos
            sat = self.diff.sat * pos
            val = self.diff.val * pos

            pixel.hue = self.base_color.hue + hue
            pixel.sat = self.base_color.sat + sat
            pixel.val = self.base_color.val + val

        return super().run_cycle(elapsed_millis, elapsed_seconds)

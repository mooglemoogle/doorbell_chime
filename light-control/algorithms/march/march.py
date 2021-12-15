import logging
import math

from .config import config
from .._meta import BaseAlgorithm

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        self.colors = settings['colors']
        self.cycle = 0
        self.since_change = 0
        self.cycle_time = settings['freq']

        self.set_colors()
    
    def set_black(self, pixel):
        pixel.hue = 0
        pixel.sat = 0
        pixel.val = 0
    
    def set_color(self, pixel, index):
        color = self.colors[index]
        pixel.hue = color[0]
        pixel.sat = color[1]
        pixel.val = color[2]

    def set_colors(self):
        num_colors = len(self.colors)
        count = math.floor(self.cycle / 2)
        is_even_cycle = self.cycle % 2 == 0

        for n in range(len(self.pixels)):
            pixel = self.pixels[n]
            is_even = n % 2 == 0

            if is_even_cycle == is_even:
                self.set_black(pixel)
            else:
                self.set_color(pixel, count)
                count += 1
                if count >= num_colors:
                    count = 0

        self.cycle += 1
        if self.cycle >= num_colors * 2:
            self.cycle = 0
    
    def run_cycle(self, _, elapsed_seconds):
        self.since_change += elapsed_seconds
        if self.since_change > self.cycle_time:
            self.since_change -= self.cycle_time
            self.set_colors()
        
        return super().run_cycle(_, elapsed_seconds)

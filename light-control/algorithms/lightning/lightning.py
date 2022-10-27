import logging
import math
import time
import random
from .config import config
from .._meta import BaseAlgorithm
from .._meta.pixel import Pixel
from .._meta.pulse import Pulse

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        
        self.bolts = []
        self.flash_color = Pixel(*settings['color'])
        self.max_bolts = settings['max_bolts']
        self.bolt_prob = settings['bolt_prob']
        self.bump_prob = settings['bump_prob']

        self.bump_perc = 0.3
    
    def add_bolt(self):
        if len(self.bolts) < self.max_bolts and random.random() < self.bolt_prob:
            position = random.randrange(0, len(self.pixels))
            width = random.randrange(4, 20)
            self.bolts.append({
                "pulse": Pulse(position, Pixel(self.flash_color.hue, self.flash_color.sat, self.flash_color.val), width, 4, 4),
                "percentage": 1.0
            })
    
    def fade_bolts(self, elapsed_seconds):
        for bolt in self.bolts:
            if (random.random() < self.bump_prob):
                bolt['percentage'] = min(1.0, bolt['percentage'] + self.bump_perc)
            else:
                bolt['percentage'] = max(0, bolt['percentage'] - elapsed_seconds * 0.5)
            bolt['pulse'].color.val = bolt['percentage'] * self.flash_color.val
    
    def clear_bolts(self):
        self.bolts = list(filter(lambda bolt: bolt['percentage'] > 0, self.bolts))

    def run_cycle(self, elapsed_millis, elapsed_seconds):
        for pixel in self.pixels:
            pixel.clear()
        self.add_bolt()

        for bolt in self.bolts:
            bolt['pulse'].apply_pulse(self.pixels)

        self.fade_bolts(elapsed_seconds)
        self.clear_bolts()

        return super().run_cycle(elapsed_millis, elapsed_seconds)

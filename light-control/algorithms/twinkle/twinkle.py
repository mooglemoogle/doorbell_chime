import logging
import math
import random

from .config import config
from .._meta import BaseAlgorithm

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        self.num_twinkles = math.ceil(settings['density'] * num_pixels)
        self.freq = settings['freq']
        self.since_choose = 0
        self.fade_time = settings['fadeTime']
        self.twinkles = [0] * num_pixels
        
        self.choose_twinkles()

        for n in range(num_pixels):
            pixel = self.pixels[n]
            pixel.hue = 0.0
            pixel.sat = 0.0
            pixel.val = 0.0
    
    def choose_twinkles(self):
        new_twinkles = random.sample(range(len(self.pixels)), k=self.num_twinkles)

        for n in new_twinkles:
            if self.twinkles[n] == 0:
                self.twinkles[n] = 1.0
    
    def run_cycle(self, _, elapsed_seconds):
        self.since_choose += elapsed_seconds
        if self.since_choose > self.freq:
            self.since_choose -= self.freq
            self.choose_twinkles()
        
        fade_amount = elapsed_seconds / self.fade_time

        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            if self.twinkles[i] > 0:
                self.twinkles[i] = max(0, self.twinkles[i] - fade_amount)
            
            pixel.val = self.twinkles[i]
        
        return super().run_cycle(_, elapsed_seconds)

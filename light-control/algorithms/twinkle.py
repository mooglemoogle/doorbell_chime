import logging
import math
import random

from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)
        self.num_twinkles = math.ceil(settings['density'] * num_pixels)
        self.freq = settings['freq']
        self.fade_per_cycle = 1.0 / (settings['fadeTime'] * self.refresh_rate())
        self.twinkles = []
        for n in range(num_pixels):
            self.twinkles[n] = 0
        
        self.choose_twinkles()

        for n in range(num_pixels):
            pixel = self.pixels[n]
            pixel.hue = 0.0
            pixel.sat = 0.0
            pixel.val = self.twinkles[n]
    
    def choose_twinkles(self):
        new_twinkles = random.sample(range(len(self.pixels)), k=self.num_twinkles)

        for n in new_twinkles:
            if self.twinkles[n] == 0:
                self.twinkles[n] = 1.0
    
    def run_cycle(self, _, elapsed_seconds):
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            if self.twinkles[i] > 0:
                self.twinkles[i] = max(0, self.twinkles[i] - self.fade_per_cycle)
            
            pixel.val = self.twinkles[i]
        
        return super().run_cycle(_, elapsed_seconds)

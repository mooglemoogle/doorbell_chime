import logging
import math
import random

from .config import config
from .._meta import BaseAlgorithm

MAX_WAVE_PERC = 0.1
WAVE_SIZE_SPEED = 7
TAU_BY_WAVE_SIZE = math.tau / WAVE_SIZE_SPEED
WAVE_SPEED = 3
TAU_BY_WAVE = math.tau / WAVE_SPEED

class FlagPart:
    def __init__(self, flag_part, total_parts, num_pixels, prior_percentage):
        self.color = flag_part['color']
        self.parts = flag_part['parts']

        self.percentage = self.parts / total_parts
        
        total_passed = prior_percentage + self.percentage
        self.split_pos = math.floor(num_pixels * total_passed)

        self.max_wave_size = math.floor(num_pixels * self.percentage * MAX_WAVE_PERC)
        self.current_wave_pos = random.uniform(0, WAVE_SPEED)
        self.current_wave_size_pos = random.uniform(0, WAVE_SIZE_SPEED)

    def update_wave_pos(self, elapsed_seconds):
        self.current_wave_size_pos += elapsed_seconds
        if self.current_wave_size_pos > WAVE_SIZE_SPEED:
            self.current_wave_size_pos -= WAVE_SIZE_SPEED

    def get_wave_size(self):
        return math.sin(self.current_wave_pos * TAU_BY_WAVE) * self.get_max_wave_size()

    def update_wave_size_pos(self, elapsed_seconds):
        self.current_wave_pos += elapsed_seconds
        if self.current_wave_pos > WAVE_SPEED:
            self.current_wave_pos -= WAVE_SPEED

    def get_max_wave_size(self):
        return math.sin(self.current_wave_size_pos * TAU_BY_WAVE_SIZE) * self.max_wave_size
    
    def update_split_pos(self, elapsed_seconds):
        self.update_wave_pos(elapsed_seconds)
        self.update_wave_size_pos(elapsed_seconds)
    
    def get_split_pos(self):
        return math.floor(self.split_pos + self.get_wave_size())

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        total_parts = sum([x['parts'] or 1 for x in settings['flag_parts']])
        num_pixels = len(self.pixels)
        num_parts = len(settings['flag_parts'])

        total_perc = 0
        self.flag_parts = []
        for index in range(num_parts):
            part = FlagPart(settings['flag_parts'][index], total_parts, num_pixels, total_perc)
            total_perc += part.percentage
            self.flag_parts.append(part)

        self.set_colors()

    def set_colors(self):
        index = 0
        num_parts = len(self.flag_parts)
        for i in range(num_parts):
            part = self.flag_parts[i]
            if i == num_parts - 1:
                split_pos = len(self.pixels)
            else:
                split_pos = part.get_split_pos() + 1

            for n in range(index, split_pos):
                pixel = self.pixels[n]
                pixel.set(*part.color)
            index = split_pos
    
    def run_cycle(self, _, elapsed_seconds):
        for part in self.flag_parts:
            part.update_split_pos(elapsed_seconds)

        self.set_colors()
        
        return super().run_cycle(_, elapsed_seconds)

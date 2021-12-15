import logging
import math

from .config import config
from .._meta import BaseAlgorithm

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        self.even_cycle = True
        self.fade_percent = 1.0
        self.colors = settings['colors']
        self.current_on_time = 0
        self.current_pulse_down_time = 0
        self.current_pulse_up_time = 0
        self.on_time = settings['onTime']
        pulse_time = settings['pulseTime']
        self.half_pulse = pulse_time / 2.0
        self.lights_per_color = settings['lightsPerColor']

        self.set_colors()

    def set_color(self, pixel, index):
        color = self.colors[index]
        pixel.hue = color[0]
        pixel.sat = color[1]
        pixel.val = color[2] * self.fade_percent

    def set_colors(self):
        color_index = 0
        if not self.even_cycle:
            color_index = 1
        light_num = 0

        for n in range(len(self.pixels)):
            pixel = self.pixels[n]

            self.set_color(pixel, color_index)
            light_num +=1
            if light_num >= self.lights_per_color:
                light_num = 0
                color_index += 1
                if color_index >= 2:
                    color_index = 0
    
    def run_cycle(self, _, elapsed_seconds):
        if self.current_pulse_down_time >= self.half_pulse and self.current_pulse_up_time == 0:
            self.even_cycle = not self.even_cycle
        
        if self.current_on_time < self.on_time:
            self.current_on_time += elapsed_seconds
        elif self.current_pulse_down_time < self.half_pulse:
            self.current_pulse_down_time += elapsed_seconds
            fade = (self.half_pulse - self.current_pulse_down_time) / self.half_pulse
            self.fade_percent = max(0, fade)
            self.set_colors()
        elif self.current_pulse_up_time < self.half_pulse:
            self.current_pulse_up_time += elapsed_seconds
            fade = self.current_pulse_up_time / self.half_pulse
            self.fade_percent = min(1.0, fade)
            self.set_colors()
        else:
            self.current_on_time = 0
            self.current_pulse_down_time = 0
            self.current_pulse_up_time = 0
        
        return super().run_cycle(_, elapsed_seconds)

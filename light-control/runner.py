import colorsys
import logging
import neopixel
import board
from importlib import import_module
from config import Config
import json
import time
import math

import os

from algorithms.off import Algorithm as Off
from algorithms.transition import Algorithm as Transition

is_dev_mode = os.getenv("MODE") == "DEVELOPMENT"

def load_algorithm(alg_config):
    return import_module('algorithms.' + alg_config['module'])

def print_colors(colors: neopixel.NeoPixel):
    return ''.join([
        '\033[48;2;{0:d};{1:d};{2:d}m  \033[0m'.format(*(colors[n])) for n in range(colors.n)
    ])

class Runner():
    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        self.config = Config()
        self.cycle_index = 0
        self.__off_alg = Off('Off', self.num_pixels(), self.config.alg_map['Off'], {})
        self.__transition_alg = Transition(
            'Transition',
            self.num_pixels(),
            self.config.alg_map['Transition'],
            {'transition_time': self.transition_time()}
        )
        self.__cur_alg = self.__off_alg
        self.__last_cycle_time = time.time()
        self.__last_change_time = time.time()
        self.__next_cycle_length = math.inf
        self.__create_pixels()
        self.__refresh_algorithms()

    def board_pin(self):
        return getattr(board, self.config.get_value('gpio_pin'))

    def num_pixels(self):
        return self.config.get_value('num_lights')

    def bpp(self):
        return self.config.get_value('bpp')
    
    def pixel_order(self):
        return getattr(neopixel, self.config.get_value('order'))
    
    def brightness(self):
        return self.config.get_value('brightness')
    
    def seconds_per_cycle(self):
        return self.config.get_value('seconds_per_cycle')
    
    def transition_time(self):
        return self.config.get_value('transition_time')

    def __create_pixels(self):
        self.pixels = neopixel.NeoPixel(
            self.board_pin(),
            self.num_pixels(),
            bpp=self.bpp(),
            pixel_order=self.pixel_order(),
            auto_write=False
        )
    
    def __refresh_algorithms(self):
        self.cycle_index = -1
        self.__alg_cycle = self.config.get_value('cycle')
        if len(self.__alg_cycle) == 0 or not self.config.get_value('running'):
            self.turn_off()
        else:
            self.next_algorithm()
        
    def next_algorithm(self):
        self.cycle_index += 1
        if self.cycle_index >= len(self.__alg_cycle):
            self.cycle_index = 0
        next_alg = self.__alg_cycle[self.cycle_index]
        self.__next_cycle_length = next_alg['seconds_in_cycle']
        next_alg_config = self.config.alg_map[next_alg['algorithm']]

        next_alg_module = load_algorithm(next_alg_config)
        self.__next_alg = next_alg_module.Algorithm(next_alg['algorithm'], self.num_pixels(), next_alg_config, next_alg['options'])
        self.__start_transition()

    def turn_off(self):
        self.cycle_index = -1
        self.__next_alg = self.__off_alg
        self.__off_alg.set_hue_sat(self.__cur_alg.pixels)
        self.__start_transition()

    def __start_transition(self):
        self.__transition_alg.reset(self.__cur_alg.pixels, self.__next_alg.pixels)
        self.__cur_alg = self.__transition_alg

    def is_off(self):
        return self.__cur_alg is self.__off_alg
    
    def is_in_transition(self):
        return self.__cur_alg is self.__transition_alg
    
    def refresh_rate(self):
        return self.__cur_alg.refresh_rate()

    def __apply_lights(self):
        for i in range(self.num_pixels()):
            pixel = self.__cur_alg.pixels[i]
            nc = colorsys.hsv_to_rgb(pixel.hue, pixel.sat, self.brightness() * pixel.val)
            if self.bpp() == 3:
                self.pixels[i] = (nc[0] * 255, nc[1] * 255, nc[2] * 255)
            elif self.bpp() == 4:
                white = pixel.white * self.brightness() * 255
                self.pixels[i] = (nc[0] * 255, nc[1] * 255, nc[2] * 255, white)

        if (is_dev_mode):
            self.logger.log(logging.DEBUG, print_colors(self.pixels))
        else:
            self.pixels.show()
    
    def __on_config_update(self):
        running = self.config.get_value('running')
        new_alg_cycle = self.config.get_value('cycle')

        if new_alg_cycle != self.__alg_cycle:
            self.logger.log(logging.INFO, "Config updated with new cycle parameters")
            self.__alg_cycle = new_alg_cycle
            self.cycle_index = -1
            if running and not self.is_off():
                self.logger.log(logging.INFO, "Reseting algorithm cycle")
                self.next_algorithm()
        if not running and not self.is_off():
            self.logger.log(logging.INFO, "Config updated 'running' property to 'false'. Stopping lights")
            self.turn_off()
        elif running and self.is_off():
            self.logger.log(logging.INFO, "Config updated 'running' property to 'true'. Starting lights")
            self.next_algorithm()
        
        self.__transition_alg.update_transition_time(self.transition_time())
    
    def run_cycle(self):
        this_cycle_time = time.time()
        since_last_change = this_cycle_time - self.__last_change_time
        # self.logger.log(logging.DEBUG, f"{since_last_change:.3f} {self.__next_cycle_length:.3f}")
        elapsed = this_cycle_time - self.__last_cycle_time
        updated = self.config.updated
        if updated:
            self.__on_config_update()
        if not self.is_off():
            result = self.__cur_alg.run_cycle(elapsed * 1000.0, elapsed)
            self.__apply_lights()
            if result:
                self.logger.log(logging.INFO, "Transition complete, moving to next algorithm")
                self.__cur_alg = self.__next_alg
                self.__last_change_time = this_cycle_time
            elif not self.is_in_transition() and since_last_change > self.__next_cycle_length:
                self.logger.log(logging.INFO, "Cycle time over, starting transition to next algorithm")
                self.next_algorithm()
        if updated:
            self.config.updated = False
        self.__last_cycle_time = this_cycle_time
    
    def destroy(self):
        self.config.destroy()
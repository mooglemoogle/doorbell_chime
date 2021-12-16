import logging
import json
import time
import math
import os
from functools import reduce

from config import Config
from cycle import Cycle
from command_watcher import CommandWatcher

from algorithms import algorithms

from light_strip import LightStrip

is_dev_mode = os.getenv("MODE") == "DEVELOPMENT"

def print_colors(colors):
    return ''.join([
        '\033[48;2;{0:d};{1:d};{2:d}m  \033[0m'.format(*(colors[n])) for n in range(colors.n)
    ])

class Runner():
    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)

        self.config = Config()
        self.cycle = Cycle()
        self.cycle_index = 0
        self.__initialize_light_strips()
        self.__off_alg = algorithms['off'].Algorithm(self.num_pixels(), {})
        self.__transition_alg = algorithms['transition'].Algorithm(
            self.num_pixels(),
            {'transition_time': self.transition_time()}
        )
        self.__cur_alg = self.__off_alg
        self.__last_cycle_time = time.time()
        self.__last_change_time = time.time()
        self.__next_cycle_length = math.inf
        self.__refresh_algorithms()

        self.commandWatcher = CommandWatcher(['next', 'off', 'on'])
    
    def num_pixels(self):
        return reduce(lambda acc, strip: acc + strip.num_pixels(), self.light_strips, 0)

    def brightness(self):
        return self.config.get_value('brightness')
    
    def seconds_per_cycle(self):
        return self.config.get_value('seconds_per_cycle')
    
    def transition_time(self):
        return self.config.get_value('transition_time')
    
    def __initialize_light_strips(self):
        light_config = self.config.get_value('light_strips')
        self.light_strips = [
            LightStrip(i, light_config[i])
            for i in range(len(light_config))
        ]
    
    def __refresh_algorithms(self):
        self.cycle_index = -1
        cycle = self.cycle.cycles
        if len(cycle) == 0 or not self.config.get_value('running'):
            self.turn_off()
        else:
            self.next_algorithm()
        
    def next_algorithm(self):
        cycle = self.cycle.cycles
        self.cycle_index += 1
        if self.cycle_index >= len(cycle):
            self.cycle_index = 0
        next_alg = cycle[self.cycle_index]
        self.__next_cycle_length = next_alg['seconds_in_cycle']
        next_alg_module = algorithms[next_alg['algorithm']]

        self.__next_alg = next_alg_module.Algorithm(self.num_pixels(), next_alg['options'])
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
        pixels = self.__cur_alg.pixels
        for strip in self.light_strips:
            strip.apply_lights(pixels, self.brightness())
            if (is_dev_mode):
                print(print_colors(strip.pixels), end='\r')
    
    def __on_config_update(self):
        running = self.config.get_value('running')

        if not running and not self.is_off():
            self.logger.log(logging.INFO, "Config updated 'running' property to 'false'. Stopping lights")
            self.turn_off()
        elif running and self.is_off():
            self.logger.log(logging.INFO, "Config updated 'running' property to 'true'. Starting lights")
            self.next_algorithm()
        
        self.__transition_alg.update_transition_time(self.transition_time())
    
    def __on_cycle_update(self):
        self.logger.log(logging.INFO, "Cycle file updated")
        running = self.config.get_value('running')
        self.cycle_index = -1
        if running and not self.is_off():
            self.logger.log(logging.INFO, "Reseting algorithm cycle")
            self.next_algorithm()

    def __on_commands(self):
        for command in self.commandWatcher.commands_received:
            if command == 'next':
                self.next_algorithm()
            elif command == 'off' and not self.is_off():
                self.turn_off()
            elif command == 'on' and self.is_off():
                self.next_algorithm()
            
            self.commandWatcher.mark_complete(command)
    
    def run_cycle(self):
        this_cycle_time = time.time()
        since_last_change = this_cycle_time - self.__last_change_time
        # self.logger.log(logging.DEBUG, f"{since_last_change:.3f} {self.__next_cycle_length:.3f}")
        elapsed = this_cycle_time - self.__last_cycle_time
        
        if self.config.updated:
            self.__on_config_update()
            self.config.updated = False
        if self.cycle.updated:
            self.__on_cycle_update()
            self.cycle.updated = False
        
        self.commandWatcher.check_messages()
        if self.commandWatcher.commands_received:
            self.__on_commands()

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
        elif is_dev_mode:
            self.logger.log(logging.DEBUG, "Cycle off")
        self.__last_cycle_time = this_cycle_time
    
    def destroy(self):
        self.config.destroy()
        self.cycle.destroy()
        self.commandWatcher.destroy()
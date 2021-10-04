import colorsys
import logging
import neopixel
import board
from importlib import import_module
import fpstimer
from config import Config

from algorithms.off import Algorithm as Off
from algorithms.transition import Algorithm as Transition

def load_algorithm(alg_config):
    return import_module('algorithms.' + alg_config['module'])

class Runner():
    def __init__(self) -> None:
        self.config = Config()
        self.cycle_index = 0
        self.__create_pixels()
        self.__refresh_algorithms()
        self.__off_alg = Off('Off', self.num_pixels(), self.config.alg_map['Off'], {})
        self.__transition_alg = Transition('Transition', self.num_pixels(), self.config.alg_map['Transition'], {})
        self.__cur_alg = self.__off_alg

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
        if len(self.__alg_cycle) == 0:
            self.turn_off()
        else:
            self.next_algorithm()
        
    def next_algorithm(self):
        self.cycle_index += 1
        if self.cycle_index >= len(self.__alg_cycle):
            self.cycle_index = 0
        next_alg = self.__alg_cycle[self.cycle_index]
        next_alg_config = self.config.alg_map[next_alg['algorithm']]

        next_alg_module = load_algorithm(next_alg_config)
        self.__next_alg = next_alg_module.Algorithm(next_alg['algorithm'], self.num_pixels(), next_alg_config, next_alg['options'])
        self.__start_transition()

    def turn_off(self):
        self.__next_alg = self.__off_alg
        self.__off_alg.set_hue_sat(self.__cur_alg.pixels)
        self.__start_transition()

    def __start_transition(self):
        self.__transition_alg.reset(self.__cur_alg.pixels, self.__next_alg.pixels)
        self.__cur_alg = self.__transition_alg

    def is_off(self):
        return self.__cur_alg == self.__off_alg
    
    def refresh_rate(self):
        return self.__cur_alg.refresh_rate()

    def __apply_lights(self):
        for i in range(self.num_pixels):
            pixel = self.__cur_alg.pixels[i]
            nc = colorsys.hsv_to_rgb(pixel.hue, pixel.sat, self.brightness() * pixel.val)
            if self.bpp() == 3:
                self.pixels[i] = (nc[0] * 255, nc[1] * 255, nc[2] * 255)
            elif self.bpp() == 4:
                white = pixel.white * self.brightness() * 255
                self.pixels[i] = (nc[0] * 255, nc[1] * 255, nc[2] * 255, white)
        self.pixels.show()
    
    def run_cycle(self):
        updated = self.config.updated
        if updated:
            if not self.config.get_value('running') and not self.is_off():
                self.turn_off()
            self.__transition_alg.update_transition_time(self.transition_time())
        if not self.is_off():
            result = self.__cur_alg.run_cycle()
            self.__apply_lights()
            if not result:
                self.__cur_alg = self.__next_alg
        if updated:
            self.config.updated = False
    
    def destroy(self):
        self.config.destroy()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s|%(name)s|%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    #TODO: take refresh rate from current algorithm, will have to get rid of fpstimer, do it custom
    timer = fpstimer.FPSTimer(60)
    runner = Runner()

    try:
        while True:
            runner.run_cycle()
            timer.sleep()
    except KeyboardInterrupt:
        runner.destroy()

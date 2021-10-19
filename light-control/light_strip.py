import os
import colorsys
from typing import List
import neopixel
import board
from algorithms.pixel import Pixel

is_dev_mode = os.getenv("MODE") == "DEVELOPMENT"

class LightStrip:
    def __init__(self, strip_index: int, config):
        self.strip_index = strip_index
        self.index_start = config["index_start"]
        self.index_end = config["index_end"]

        if self.index_start < 0 or self.index_end < 0 or self.index_start == self.index_end:
            raise Exception('No light strip index may be below zero and they must be different')

        self.gpio_pin = config["gpio_pin"]
        self.bpp = config["bpp"]
        self.order = config["order"]

        self.__generate_pixels()

    def num_pixels(self):
        return abs(self.index_end - self.index_start) + 1

    def board_pin(self):
        return getattr(board, self.gpio_pin)
    
    def pixel_order(self):
        return getattr(neopixel, self.order)
    
    def __generate_pixels(self):
        self.pixels = neopixel.NeoPixel(
            self.board_pin(),
            self.num_pixels(),
            bpp=self.bpp,
            pixel_order=self.pixel_order(),
            auto_write=False
        )
    
    def get_ranges(self):
        reversed = self.index_end < self.index_start
        lower = self.index_start if not reversed else self.index_end
        higher = self.index_end if not reversed else self.index_start
        step = 1 if not reversed else -1

        hardware_range = range(0, higher - lower + 1)
        pixel_range = range(self.index_start, self.index_end + step, step)
        return zip(hardware_range, pixel_range)
    
    def apply_lights(self, lights: List[Pixel], brightness: float):
        index_ranges = self.get_ranges()
        for (light_ind, pixel_ind) in index_ranges:
            pixel = lights[pixel_ind]
            nc = colorsys.hsv_to_rgb(pixel.hue, pixel.sat, brightness * pixel.val)
            if self.bpp == 3:
                self.pixels[light_ind] = (nc[0] * 255, nc[1] * 255, nc[2] * 255)
            elif self.bpp == 4:
                white = pixel.white * brightness * 255
                self.pixels[light_ind] = (nc[0] * 255, nc[1] * 255, nc[2] * 255, white)
        
        if not is_dev_mode:
            self.pixels.show()
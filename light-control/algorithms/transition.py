from algorithms.algorithm import Algorithm
from helpers import get_millis, bezier_blend

#TODO: Make this configurable. Should be simple
TRANSITION_TIME = 1000

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)

        self.__previous_pixels = []
        self.__next_pixels = []
        self.__start_time = 0
    
    def reset(self, previous_pixels, next_pixels):
        self.__previous_pixels = previous_pixels
        self.__next_pixels = next_pixels
        self.__start_time = get_millis()

    def run_cycle(self, pixel_strip):
        super().run_cycle(pixel_strip)
        run_time = get_millis()

        if run_time - self.__start_time > TRANSITION_TIME:
            for i in range(len(self.pixels)):
                pixel = self.pixels[i]
                pixel.hue = self.__next_pixels[i].hue
                pixel.sat = self.__next_pixels[i].sat
                pixel.val = self.__next_pixels[i].val
                pixel.white = self.__next_pixels[i].white
            return True
        else:
            elapsed = run_time - self.__start_time
            percentage = elapsed / TRANSITION_TIME
            light_percent = bezier_blend(percentage)
            for i in range(len(self.pixels)):
                pixel = self.pixels[i]
                prev = self.__previous_pixels[i]
                next = self.__next_pixels[i]

                pixel.hue = prev.hue + (next.hue - prev.hue) * light_percent
                pixel.sat = prev.sat + (next.sat - prev.sat) * light_percent
                pixel.val = prev.val + (next.val - prev.val) * light_percent
                pixel.white = prev.white + (next.white - prev.white) * light_percent
            return False



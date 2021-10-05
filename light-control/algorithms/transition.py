from algorithms.algorithm import Algorithm
from algorithms.helpers import get_millis, bezier_blend

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)

        self.__previous_pixels = []
        self.__next_pixels = []
        self.__start_time = 0

    def update_transition_time(self, new_val):
        self.__settings['transition_time'] = new_val
    
    def transition_time(self):
        return self.settings()['transition_time']
    
    def reset(self, previous_pixels, next_pixels):
        self.__previous_pixels = previous_pixels
        self.__next_pixels = next_pixels
        self.__start_time = get_millis()

    def run_cycle(self, elaspsed_millis, elapsed_seconds):
        super().run_cycle(elaspsed_millis, elapsed_seconds)
        run_time = get_millis()

        if run_time - self.__start_time > self.transition_time():
            for i in range(len(self.pixels)):
                pixel = self.pixels[i]
                pixel.hue = self.__next_pixels[i].hue
                pixel.sat = self.__next_pixels[i].sat
                pixel.val = self.__next_pixels[i].val
                pixel.white = self.__next_pixels[i].white
            return True
        else:
            elapsed = run_time - self.__start_time
            percentage = elapsed / self.transition_time()
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



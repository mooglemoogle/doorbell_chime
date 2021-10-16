from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            pixel.hue = 0
            pixel.sat = 0
            pixel.val = 1
            pixel.white = 0
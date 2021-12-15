from ._meta import BaseAlgorithm

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            pixel.hue = 0
            pixel.sat = 0
            pixel.val = 1
            pixel.white = 0

config = {
    "name": "White",
    "options": {},
    "refresh_rate": 2
}
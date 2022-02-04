from ._meta import BaseAlgorithm
from ._meta.pulse import Pulse
from ._meta.pixel import Pixel

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)

        pulse = Pulse(len(self.pixels) / 3, Pixel(0, 1, 1), 3, 6, 6)
        pulse2 = Pulse(len(self.pixels) / 2, Pixel(0.5, 1, 1), 3, 6, 6)

        pulse.apply_pulse(self.pixels)
        pulse2.apply_pulse(self.pixels)

config = {
    "name": "Singe Pulse",
    "options": {},
    "refresh_rate": 60
}
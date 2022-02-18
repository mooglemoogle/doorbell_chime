from ._meta import BaseAlgorithm
from ._meta.pulse import Pulse
from ._meta.pixel import Pixel

forward = 15
backward = 6

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)

        self.speed = settings["speed"]
        self.half_width = settings["width"] / 2
        self.color = settings["color"]
        self.border = settings["border"]
        self.full_size = len(self.pixels)
        self.effect_size = self.full_size - (self.border * 2)
        self.per_second = (self.effect_size * 2) / self.speed
        self.fade_per_second = 1.0 / settings["fade_time"]
        self.right = True
        self.pulse_loc = 0
    
    def run_cycle(self, elapsed_millis: float, elapsed_seconds: float) -> bool:
        self.pulse_loc += elapsed_seconds * self.per_second * (1 if self.right else -1)
        if self.pulse_loc > self.effect_size:
            self.pulse_loc = self.effect_size - (self.pulse_loc - self.effect_size)
            self.right = False
        elif self.pulse_loc < 0:
            self.pulse_loc *= -1
            self.right = True
        
        for n in range(self.effect_size):
            pixel = self.pixels[n + self.border]
            if n >= round(self.pulse_loc - self.half_width) and n <= round(self.pulse_loc + self.half_width):
                pixel.set(*self.color)
            else:
                pixel.val = max(pixel.val - (self.fade_per_second * elapsed_seconds), 0)

        return super().run_cycle(elapsed_millis, elapsed_seconds)

config = {
    "name": "KITT",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "color": {
                "title": "Color (HSV)",
                "type": "array",
                "minItems": 3,
                "maxItems": 4,
                "items": {
                    "type": "number",
                    "inclusiveMinimum": 0.0,
                    "inclusiveMaximum": 1.0
                }
            },
            "width": {
                "title": "Number of Pixels for Solid Light",
                "type": "float",
                "default": 3
            },
            "speed": {
                "title": "Seconds per cycle (higher is slower)",
                "type": "float",
                "default": 4
            },
            "fade_time": {
                "title": "Fade time",
                "description": "Time it takes for a pixel to fade once it's no longer lit (seconds)",
                "type": "float",
                "default": 1
            },
            "border": {
                "title": "Border",
                "description": "Limit size of effect with a border on each side",
                "type": "integer",
                "default": 0
            }
        },
        "default": {
            "color": [0, 1.0, 1.0],
            "width": 3,
            "speed": 4,
            "fade_time": 1,
            "border": 0
        }
    },
    "refresh_rate": 60
}
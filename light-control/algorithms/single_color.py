from ._meta import BaseAlgorithm

class Algorithm(BaseAlgorithm):
    def __init__(self, num_pixels, settings) -> None:
        super().__init__(num_pixels, config, settings)
        color = settings['color']
        for i in range(len(self.pixels)):
            self.pixels[i].set(*color)

config = {
    "name": "Single Color",
    "options": {
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
        }
    },
    "refresh_rate": 2
}
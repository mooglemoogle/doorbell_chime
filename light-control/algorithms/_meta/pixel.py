import colorsys

class Pixel:
    hue = 0.0
    sat = 0.0
    val = 0.0
    white = 0.0

    def __init__(self, hue=0, sat=0, val=0, white=0):
        self.set(hue, sat, val, white)

    def set(self, hue, sat, val, white=0):
        self.hue = hue
        self.sat = sat
        self.val = val
        self.white = white
    
    def clear(self):
        self.set(0, 0, 0, 0)

    def multiply(self, value):
        return Pixel(self.hue, self.sat, self.val * value, self.white * value);
    
    def diff(self, other):
        return Pixel(
            self.hue - other.hue,
            self.sat - other.sat,
            self.val - other.val,
            self.white - other.white
        )

    def combine_with(self, other_pixel):
        my_rgb = self.get_raw_rgb()
        other_rgb = other_pixel.get_raw_rgb()

        new_rgb = (
            min(my_rgb[0] + other_rgb[0], 1.0),
            min(my_rgb[1] + other_rgb[1], 1.0),
            min(my_rgb[2] + other_rgb[2], 1.0),
        )
        self.from_rgb(*new_rgb)

    def from_rgb(self, r, g, b):
        [hue, sat, val] = colorsys.rgb_to_hsv(r, g, b);
        self.hue = hue
        self.sat = sat
        self.val = val
    
    def get_raw_rgb(self):
        return colorsys.hsv_to_rgb(self.hue, self.sat, self.val)

    def get_rgb(self, brightness):
        max_val = 255
        rgb = colorsys.hsv_to_rgb(self.hue, self.sat, self.val * brightness)
        return (rgb[0] * max_val, rgb[1] * max_val, rgb[2] * max_val)
    
    def get_rgbw(self, brightness):
        rgb = self.get_rgb(brightness)
        max_val = 255 * brightness
        return (rgb[0], rgb[1], rgb[2], self.white * max_val)


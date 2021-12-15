import colorsys

class Pixel:
    hue = 0.0
    sat = 0.0
    val = 0.0
    white = 0.0

    def get_rgb(self, brightness):
        max_val = 255
        rgb = colorsys.hsv_to_rgb(self.hue, self.sat, self.val * brightness)
        return (rgb[0] * max_val, rgb[1] * max_val, rgb[2] * max_val)
    
    def get_rgbw(self, brightness):
        rgb = self.get_rgb(brightness)
        max_val = 255 * brightness
        return (rgb[0], rgb[1], rgb[2], self.white * max_val)


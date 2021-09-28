import colorsys

class Pixel:
    hue = 0.0
    sat = 0.0
    val = 0.0

    def get_rgb(self, brightness):
        max_val = 255 * brightness
        rgb = colorsys.hsv_to_rgb(self.hue, self.sat, self.val)
        return (rgb[0] * max_val, rgb[1] * max_val, rgb[2] * max_val)

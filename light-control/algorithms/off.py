from algorithms.algorithm import Algorithm

class Algorithm(Algorithm):
    """The goal for this algorithm is to have a target so that after a
    transition, the lights are all off and so that the transition from
    the last state to off is nice looking. As such, we provide a special
    function called `set_hue_sat` which allows the managing system to pass
    in the state of pixels before transition so that we can set the target
    hue and saturation to that of the last state. Since a value of 0 results
    in black without respect to the other settings, taking the hue and sat from
    the previous results lets us fade to black without cycling through colors
    or going to gray first."""
    def __init__(self, name, num_pixels, alg_config, settings) -> None:
        super().__init__(name, num_pixels, alg_config, settings)
    
    def set_hue_sat(self, previous_pixels):
        for i in range(len(self.pixels)):
            pixel = self.pixels[i]
            pixel.hue = previous_pixels[i].hue
            pixel.sat = previous_pixels[i].sat
            pixel.val = 0
            pixel.white = 0
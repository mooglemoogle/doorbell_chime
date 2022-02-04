from typing import List
from .pixel import Pixel
from .helpers import bezier_blend
import math

class Pulse:
    def __init__(self, location: float, color: Pixel, size: float, drop_off_right: float, drop_off_left: float) -> None:
        self.location = location
        self.color = color
        self.size = size
        self.drop_off_right = drop_off_right
        self.drop_off_left = drop_off_left
    
    def apply_pulse(self, current_pixels: List[Pixel]) -> List[Pixel]:
        main_bound = self.size / 2.0
        left_bound = max(math.floor(self.location - main_bound - self.drop_off_left), 0);
        right_bound = min(math.ceil(self.location + main_bound + self.drop_off_right), len(current_pixels));
        
        for n in range(left_bound, right_bound + 1):
            pixel = current_pixels[n]
            if n <= self.location:
                if n >= self.location - main_bound:
                    pixel.combine_with(self.color)
                else:
                    distance = self.location - main_bound - n
                    percentage = 1 - (distance / self.drop_off_left)
                    pixel.combine_with(self.color.multiply(bezier_blend(percentage)))
            elif n > self.location:
                if n <= self.location + main_bound:
                    pixel.combine_with(self.color)
                else:
                    distance = n - self.location - main_bound
                    percentage = 1 - (distance / self.drop_off_right)
                    pixel.combine_with(self.color.multiply(bezier_blend(percentage)))


    @property
    def location(self) -> float:
        return self._location
    @location.setter
    def location(self, value: float):
        self._location = value

    @property
    def color(self) -> Pixel:
        return self._color
    @color.setter
    def color(self, value: Pixel):
        self._color = value

    @property
    def size(self) -> float:
        return self._size
    @size.setter
    def size(self, value: float):
        self._size = value
    
    @property
    def drop_off_right(self) -> float:
        return self._drop_off_right
    @drop_off_right.setter
    def drop_off_right(self, value: float):
        self._drop_off_right = value
    
    @property
    def drop_off_left(self) -> float:
        return self._drop_off_left
    @drop_off_left.setter
    def drop_off_left(self, value: float):
        self._drop_off_left = value
    

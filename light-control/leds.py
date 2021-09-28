from gpiozero import Button
from signal import pause
import board
import neopixel
import colorsys
import time
import signal
import sys

brightness = 0.2
cycle = True
num_pixels = 30
pixels = neopixel.NeoPixel(board.D18, num_pixels, bpp=3, pixel_order=neopixel.GRB, auto_write=False)

pixel_hues = [(0.1 * (n % 10)) for n in range(num_pixels)] # [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

def start_cycle():
    print("switch on")
    global cycle
    cycle = True

def stop_cycle():
    print("switch off")
    global cycle
    cycle = False

def do_cycle(cycle):
    pixels.fill(0x330000)
    # # print(pixel_hues)
    # for i in range(len(pixel_hues)):
    #     nc = colorsys.hsv_to_rgb(pixel_hues[i], 1.0, 0.5)
    #     # print(nc)
    #     pixels[i] = (brightness * nc[0] * 255, brightness * nc[1] * 255, brightness * nc[2] * 255)
    #     pixel_hues[i] = pixel_hues[i] + (0.01 if cycle else -0.01)
    #     if pixel_hues[i] > 1.0:
    #         pixel_hues[i] = 0
    #     if pixel_hues[i] < 0.0:
    #         pixel_hues[i] = 1.0
    pixels.show()

switch = Button(4)

switch.when_pressed = start_cycle
switch.when_released = stop_cycle

print("Started up")

def signal_handler(sig, frame):
    pixels.fill(0x000000)
    pixels.show()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

while True:
    do_cycle(cycle)
    time.sleep(1.0/60.0)
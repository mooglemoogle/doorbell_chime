# Light Control

An application to control a strip of individually addressable RGB(W) lights. Includes some algorithms for light patterns and a way to configure and build cycles of patterns.

Built for Raspberry Pi. Will run on as small as a Raspberry Pi Zero W. Will run in a development environment and print the light output to the console.

## Setup

Copy "light_config_sample.json" to a new file called "light_config.json" and edit the file to match the properties of your light strip and the pin that will be used to control it.

If running in a development environment, copy ".env.sample" to ".env" and make sure "MODE" is set to "DEVELOPMENT"

Use pipenv to install requirements in parent directory and run `python index.py`.

## Cycles

Cycle definitions are structured as a JSON file with a root object with two properties:

-   A display name as "name"
-   An array consisting of an ordered set of algorithm config objects as "cycles".

The order in this file will determine the order the algorithms will run.

Each algorithm config consists of three properties:

-   "algorithm" - The name of the module of the algorithm to run
-   "seconds_in_cycle" - Number of seconds to stay in the algorithm before moving to the next item
-   "options" - An object of options that are specific to the particular aglorithm

Cycle definitions should be placed in the "cycles" folder and they will be monitored and updated as they change.

## Algorithms

Algorithm definitions can be added by adding modules to the "algorithms" folder. The primary requirements for an algorithm are to export a class named "Algorithm" which extends BaseAlgorithm from `._meta`, and a dictionary that defines the config options for the algorithm.

The config dictionary should have three properties:

-   "name" - The display name for the algorithm
-   "refresh_rate" - How many times per second the algorithm's update function should be run
-   "options" - A JSONSchema document defining the options for the algorithm

The "options" document will allow for options to be verified before use and to produce a configuration interface in the management UI

The Algorithm class is instantiated and provided the number of pixels to render as well as the settings from the cycle configuration. It creates itself a list of Pixel objects called "pixels". At the end of the `__init__`, the instance's pixels list should be set to the colors for the transition target. Once the transition is complete and the algorithm starts running, the runner will call the instance's `run_cycle` method passing in the amount of time that has elapsed since the last call to run_cycle in both milliseconds and seconds, targeting 1/<refresh_rate> seconds

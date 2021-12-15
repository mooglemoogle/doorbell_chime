import os
from importlib import import_module

algorithms = {}

modules = map(lambda x: os.path.splitext(x)[0], filter(lambda x: not x.startswith('_'), os.listdir(os.path.dirname(__file__))))
for m in modules:
    mod = import_module('.' + m, 'algorithms')
    algorithms[m] = mod
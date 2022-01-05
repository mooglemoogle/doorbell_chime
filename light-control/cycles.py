import os
import os.path
from cycle import Cycle

class Cycles:
    def __init__(self, cycle_directory = './cycles') -> None:
        self.cycles = []
        self.cycle_names = []
        self.cycle_map = {}
        self.__cycle_directory = os.path.abspath(cycle_directory)

        self.reload_cycles()

    def reload_cycles(self):
        if (not os.path.exists(self.__cycle_directory) or not os.path.isdir(self.__cycle_directory)):
            raise Exception('cycles directory does not exist or is not a directory')
        
        cycle_files = os.listdir(self.__cycle_directory)
        self.cycles = list(map(lambda file: Cycle(os.path.join(self.__cycle_directory, file)), cycle_files))
        self.cycle_names = [cycle.name for cycle in self.cycles]
        self.cycle_map = {cycle.name: cycle for cycle in self.cycles}

    def get_cycle(self, name):
        if name in self.cycle_map:
            return self.cycle_map[name]
        else:
            return self.get_default_cycle()

    def get_default_cycle(self):
        if 'Default' in self.cycle_map:
            return self.cycle_map['Default']
        elif 'default' in self.cycle_map:
            return self.cycle_map['default']
        else:
            return self.cycles[0]


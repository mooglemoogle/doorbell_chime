import logging
from importlib import import_module
import fpstimer
from config import Config

def load_algorithm(alg_config):
    return import_module('algorithms.' + alg_config['module'])

class Runner():
    def __init__(self) -> None:
        self.config = Config()
        self.__refresh_algorithm()
    
    def __refresh_algorithm(self):
        self.__cur_alg_name = self.config.get_value('selected_algorithm')
        self.__cur_alg_config = self.config.alg_map[self.__cur_alg_name]

        self.__cur_alg_module = load_algorithm(self.__cur_alg_config)
        self.__cur_alg = self.__cur_alg_module.Algorithm(self.__cur_alg_name, self.config)
    
    def run_cycle(self):
        updated = self.config.updated
        if updated and self.config.get_value('selected_algorithm') != self.__cur_alg_name:
            self.__refresh_algorithm()
        if self.config.get_value('running'):
            self.__cur_alg.run_cycle()
        if updated:
            self.config.updated = False
    
    def destroy(self):
        self.__cur_alg.stop()
        self.config.destroy()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s|%(name)s|%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    timer = fpstimer.FPSTimer(10)
    runner = Runner()

    try:
        while True:
            runner.run_cycle()
            timer.sleep()
    except KeyboardInterrupt:
        runner.destroy()

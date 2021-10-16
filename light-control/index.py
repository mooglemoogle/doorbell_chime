import logging
from timer import Timer

from dotenv import load_dotenv
load_dotenv()

from runner import Runner

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s|%(name)s|%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    timer = Timer(60)
    runner = Runner()

    try:
        while True:
            timer.update_fps(runner.refresh_rate())
            runner.run_cycle()
            timer.sleep()
    except KeyboardInterrupt:
        runner.destroy()

import logging.config
import os
from timer import Timer

from dotenv import load_dotenv
load_dotenv()

from runner import Runner

is_dev_mode = os.getenv("MODE") == "DEVELOPMENT"

if __name__ == '__main__':
    if is_dev_mode:
        logging.config.fileConfig('dev-logging.conf')
    else:
        logging.config.fileConfig('logging.conf')

    timer = Timer(60)
    runner = Runner()

    try:
        while True:
            timer.update_fps(runner.refresh_rate())
            runner.run_cycle()
            timer.sleep()
    except KeyboardInterrupt:
        runner.destroy()

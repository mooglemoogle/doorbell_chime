import logging
import fpstimer

from dotenv import load_dotenv
load_dotenv()

from runner import Runner

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s|%(name)s|%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    #TODO: take refresh rate from current algorithm, will have to get rid of fpstimer, do it custom
    timer = fpstimer.FPSTimer(60)
    runner = Runner()

    try:
        while True:
            runner.run_cycle()
            timer.sleep()
    except KeyboardInterrupt:
        runner.destroy()

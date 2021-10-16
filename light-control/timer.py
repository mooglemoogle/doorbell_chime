import time

__version__ = '0.0.1'

class Timer:
    def __init__(self, frames_per_second):
        """
        Create a Timer object that is locked at a specific framerate,
        as dictated by the integer passed for the frames_per_second parameter.
        """
        self._last_call_end_time = time.time()
        self.update_fps(frames_per_second)

    def update_fps(self, new_frames_per_second):
        self._frames_per_second = new_frames_per_second

        if not isinstance(self._frames_per_second, (int, float)):
            raise TypeError('frames_per_second must be a positive, nonzero int or float')
        if isinstance(self._frames_per_second, (int, float)) and self._frames_per_second <= 0:
            raise ValueError('frames_per_second must be a positive, nonzero int or float')

        self._frame_duration = 1.0 / self._frames_per_second
        self._last_zero_call_end_time = self._last_call_end_time
        self._last_zero_count = 1


    def sleep(self):
        """
        Pause for a certain length of time to maintain the a regular
        framerate. The framerate is set by the constructor argument and
        cannot be changed. This method should be called after the work
        for the current frame has been completed. If it has been longer
        than 1 / self._frames_per_second seconds, the pause duration will be
        0.0. Returns the pause length in seconds as a float.
        """

        cur_time = time.time()
        # Calculate the amount of time the pause should last, in seconds:
        sleep_time = self._last_zero_call_end_time + (self._frame_duration * self._last_zero_count) - cur_time

        # If it has been too long since the last time sleep() was called,
        # don't pause at all.
        if sleep_time < 0:
            self._last_call_end_time = cur_time
            self._last_zero_call_end_time = self._last_call_end_time
            self._last_zero_count = 1
            return 0.0

        time.sleep(sleep_time)

        self._last_call_end_time = time.time()
        self._last_zero_count += 1

        return sleep_time